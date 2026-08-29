#!/usr/bin/env bash
# Build Docker image, push to ECR, create or update App Runner service.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$SCRIPT_DIR/.state/provision.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Run infra/provision.sh first"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/config.env"
fi

AWS_REGION="$(jq -r .awsRegion "$STATE_FILE")"
ECR_URI="$(jq -r .ecrUri "$STATE_FILE")"
INSTANCE_ROLE_ARN="$(jq -r .instanceRoleArn "$STATE_FILE")"
APPRUNNER_ACCESS_ROLE_ARN="$(jq -r .apprunnerAccessRoleArn "$STATE_FILE")"
UPLOADS_BUCKET="$(jq -r .uploadsBucket "$STATE_FILE")"
PROJECT="$(jq -r .ecrRepo "$STATE_FILE" | sed 's/-api$//')"
DOMAIN="$(jq -r .domain "$STATE_FILE")"

: "${APPRUNNER_CPU:=0.25 vCPU}"
: "${APPRUNNER_MEMORY:=0.5 GB}"

SERVICE_NAME="${PROJECT}-api"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

echo "==> Docker login ECR"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${ECR_URI%%/*}"

echo "==> Build image"
docker build -t "$IMAGE_URI" "$ROOT_DIR"

echo "==> Push image"
docker push "$IMAGE_URI"

build_ssm_env() {
  local keys=(
    NODE_ENV PORT MONGODB_URI JWT_SECRET JWT_COOKIE_NAME CLIENT_URL SERVER_PUBLIC_URL
    GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ADMIN_EMAILS ADMIN_ORDER_NOTIFY_EMAIL
    RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET
    SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM REDIS_URL
    S3_UPLOADS_BUCKET AWS_REGION
  )
  local json='{"NODE_ENV":"production","PORT":"4000","S3_UPLOADS_BUCKET":"'"$UPLOADS_BUCKET"'","AWS_REGION":"'"$AWS_REGION"'"}'
  for key in MONGODB_URI JWT_SECRET JWT_COOKIE_NAME CLIENT_URL SERVER_PUBLIC_URL \
    GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ADMIN_EMAILS ADMIN_ORDER_NOTIFY_EMAIL \
    RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET \
    SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM REDIS_URL; do
    VAL="$(aws ssm get-parameter --name "/${PROJECT}/prod/${key}" --with-decryption \
      --region "$AWS_REGION" --query Parameter.Value --output text 2>/dev/null || echo "")"
    if [[ -n "$VAL" && "$VAL" != "CHANGE_ME" ]]; then
      VAL_ESCAPED="${VAL//\"/\\\"}"
      json="$(echo "$json" | jq --arg k "$key" --arg v "$VAL_ESCAPED" '. + {($k): $v}')"
    fi
  done
  echo "$json"
}

ENV_JSON="$(build_ssm_env)"
TMP_SERVICE="$(mktemp)"
cat > "$TMP_SERVICE" <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "AuthenticationConfiguration": {
      "AccessRoleArn": "$APPRUNNER_ACCESS_ROLE_ARN"
    },
    "AutoDeploymentsEnabled": false,
    "ImageRepository": {
      "ImageIdentifier": "$IMAGE_URI",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "4000",
        "RuntimeEnvironmentVariables": $ENV_JSON
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "$APPRUNNER_CPU",
    "Memory": "$APPRUNNER_MEMORY",
    "InstanceRoleArn": "$INSTANCE_ROLE_ARN"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/api/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

SERVICE_ARN="$(aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn | [0]" --output text)"

if [[ -z "$SERVICE_ARN" || "$SERVICE_ARN" == "None" ]]; then
  echo "==> Create App Runner service"
  SERVICE_ARN="$(aws apprunner create-service --region "$AWS_REGION" \
    --cli-input-json "file://$TMP_SERVICE" \
    --query Service.ServiceArn --output text)"
  echo "Waiting for service to be running..."
  aws apprunner wait service-running --service-arn "$SERVICE_ARN" --region "$AWS_REGION"
else
  echo "==> Update App Runner service"
  aws apprunner update-service --region "$AWS_REGION" \
    --service-arn "$SERVICE_ARN" \
    --source-configuration "$(jq -c '.SourceConfiguration' "$TMP_SERVICE")" \
    --instance-configuration "$(jq -c '.InstanceConfiguration' "$TMP_SERVICE")" \
    --health-check-configuration "$(jq -c '.HealthCheckConfiguration' "$TMP_SERVICE")"
  aws apprunner wait service-running --service-arn "$SERVICE_ARN" --region "$AWS_REGION"
fi

SERVICE_URL="$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --region "$AWS_REGION" \
  --query Service.ServiceUrl --output text)"

jq --arg url "$SERVICE_URL" --arg arn "$SERVICE_ARN" \
  '. + {apprunnerServiceArn: $arn, apprunnerServiceUrl: $url}' "$STATE_FILE" > "${STATE_FILE}.tmp" \
  && mv "${STATE_FILE}.tmp" "$STATE_FILE"

rm -f "$TMP_SERVICE"
echo "App Runner URL: $SERVICE_URL"
echo "Health: https://${SERVICE_URL}/api/health"
