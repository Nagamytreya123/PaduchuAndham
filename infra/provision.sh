#!/usr/bin/env bash
# Provision S3, ECR, ACM, CloudFront, Route53 records, App Runner IAM, and SSM parameter placeholders.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/config.env"
fi

: "${AWS_REGION:=ap-south-1}"
: "${ACM_REGION:=us-east-1}"
: "${DOMAIN:=www.paduchuandham.com}"
: "${DOMAIN_ALTERNATE:=paduchuandham.com}"
: "${PROJECT:=paduchuandham}"

STATE_DIR="$SCRIPT_DIR/.state"
mkdir -p "$STATE_DIR"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text | tr -d '\r\n')"
FRONTEND_BUCKET="${PROJECT}-frontend-${ACCOUNT_ID}"
UPLOADS_BUCKET="${PROJECT}-uploads-${ACCOUNT_ID}"
ECR_REPO="${PROJECT}-api"
STATE_FILE="$STATE_DIR/provision.json"

echo "==> Account $ACCOUNT_ID | region $AWS_REGION"

create_bucket() {
  local bucket="$1"
  if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    echo "Bucket $bucket exists"
    return
  fi
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$bucket"
  else
    aws s3api create-bucket --bucket "$bucket" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi
  aws s3api put-public-access-block --bucket "$bucket" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  echo "Created bucket $bucket"
}

echo "==> S3 buckets"
create_bucket "$FRONTEND_BUCKET"
create_bucket "$UPLOADS_BUCKET"

echo "==> ECR repository"
if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" 2>/dev/null; then
  aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true
fi
ECR_URI="$(aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" \
  --query 'repositories[0].repositoryUri' --output text)"

echo "==> ACM certificate (us-east-1 for CloudFront)"
CERT_ARN="$(aws acm list-certificates --region "$ACM_REGION" \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN_ALTERNATE}'].CertificateArn | [0]" --output text)"
if [[ -z "$CERT_ARN" || "$CERT_ARN" == "None" ]]; then
  CERT_ARN="$(aws acm request-certificate --region "$ACM_REGION" \
    --domain-name "$DOMAIN_ALTERNATE" \
    --subject-alternative-names "$DOMAIN" \
    --validation-method DNS \
    --query CertificateArn --output text)"
  echo "Requested ACM cert: $CERT_ARN"
  echo "Add DNS validation records from:"
  aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$ACM_REGION" \
    --query 'Certificate.DomainValidationOptions'
else
  echo "Using existing cert: $CERT_ARN"
fi

echo "==> App Runner ECR access role"
APPRUNNER_ACCESS_ROLE_NAME="${PROJECT}-apprunner-ecr-access"
if ! aws iam get-role --role-name "$APPRUNNER_ACCESS_ROLE_NAME" 2>/dev/null; then
  aws iam create-role --role-name "$APPRUNNER_ACCESS_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "build.apprunner.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'
  aws iam attach-role-policy --role-name "$APPRUNNER_ACCESS_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
fi
APPRUNNER_ACCESS_ROLE_ARN="$(aws iam get-role --role-name "$APPRUNNER_ACCESS_ROLE_NAME" --query Role.Arn --output text)"

echo "==> App Runner instance role (S3 uploads)"
INSTANCE_ROLE_NAME="${PROJECT}-apprunner-instance"
if ! aws iam get-role --role-name "$INSTANCE_ROLE_NAME" 2>/dev/null; then
  aws iam create-role --role-name "$INSTANCE_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'
  aws iam put-role-policy --role-name "$INSTANCE_ROLE_NAME" \
    --policy-name "${PROJECT}-s3-uploads" \
    --policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Action\": [\"s3:PutObject\", \"s3:GetObject\", \"s3:DeleteObject\"],
        \"Resource\": \"arn:aws:s3:::${UPLOADS_BUCKET}/uploads/*\"
      }]
    }"
fi
INSTANCE_ROLE_ARN="$(aws iam get-role --role-name "$INSTANCE_ROLE_NAME" --query Role.Arn --output text)"

echo "==> SSM parameter placeholders (set real values before App Runner deploy)"
for key in MONGODB_URI JWT_SECRET CLIENT_URL SERVER_PUBLIC_URL \
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ADMIN_EMAILS ADMIN_ORDER_NOTIFY_EMAIL \
  RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET \
  SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM REDIS_URL; do
  PARAM="/${PROJECT}/prod/${key}"
  if ! aws ssm get-parameter --name "$PARAM" --region "$AWS_REGION" 2>/dev/null; then
    aws ssm put-parameter --name "$PARAM" --type SecureString --value "CHANGE_ME" --region "$AWS_REGION"
    echo "Created placeholder $PARAM"
  fi
done

cat > "$STATE_FILE" <<EOF
{
  "accountId": "$ACCOUNT_ID",
  "awsRegion": "$AWS_REGION",
  "frontendBucket": "$FRONTEND_BUCKET",
  "uploadsBucket": "$UPLOADS_BUCKET",
  "ecrRepo": "$ECR_REPO",
  "ecrUri": "$ECR_URI",
  "certArn": "$CERT_ARN",
  "apprunnerAccessRoleArn": "$APPRUNNER_ACCESS_ROLE_ARN",
  "instanceRoleArn": "$INSTANCE_ROLE_ARN",
  "domain": "$DOMAIN",
  "domainAlternate": "$DOMAIN_ALTERNATE"
}
EOF

echo "==> Provision state written to $STATE_FILE"
echo "Next: validate ACM cert DNS, set SSM secrets, run infra/deploy-api.sh and infra/deploy-frontend.sh"
