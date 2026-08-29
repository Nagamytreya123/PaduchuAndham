#!/usr/bin/env bash
# Deploy API to ECS Fargate + ALB (fallback when App Runner subscription is not active).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
STATE_FILE="$SCRIPT_DIR/.state/provision.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Run infra/provision.sh first"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/config.env"
fi

AWS_REGION="$(jq -r .awsRegion "$STATE_FILE" | tr -d '\r\n')"
ACCOUNT_ID="$(jq -r .accountId "$STATE_FILE" | tr -d '\r\n')"
ECR_URI="$(jq -r .ecrUri "$STATE_FILE" | tr -d '\r\n')"
INSTANCE_ROLE_ARN="$(jq -r .instanceRoleArn "$STATE_FILE" | tr -d '\r\n')"
UPLOADS_BUCKET="$(jq -r .uploadsBucket "$STATE_FILE" | tr -d '\r\n')"
PROJECT="$(jq -r .ecrRepo "$STATE_FILE" | sed 's/-api$//' | tr -d '\r\n')"
IMAGE_URI="${ECR_URI}:latest"
CLUSTER="${PROJECT}-cluster"
SERVICE="${PROJECT}-api"
TG_NAME="${PROJECT}-api-tg"
ALB_NAME="${PROJECT}-api-alb"
EXEC_ROLE_NAME="${PROJECT}-ecs-exec"
LOG_GROUP="/ecs/${PROJECT}-api"

: "${AWS_REGION:=ap-south-1}"

echo "==> ECS Fargate deploy | $AWS_REGION"

# Execution role for ECR + logs
if ! aws iam get-role --role-name "$EXEC_ROLE_NAME" 2>/dev/null; then
  aws iam create-role --role-name "$EXEC_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "ecs-tasks.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'
  aws iam attach-role-policy --role-name "$EXEC_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
  aws iam put-role-policy --role-name "$EXEC_ROLE_NAME" \
    --policy-name "${PROJECT}-ssm-read" \
    --policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Action\": [\"ssm:GetParameters\", \"ssm:GetParameter\"],
        \"Resource\": \"arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/${PROJECT}/prod/*\"
      }]
    }"
fi
EXEC_ROLE_ARN="$(aws iam get-role --role-name "$EXEC_ROLE_NAME" --query Role.Arn --output text | tr -d '\r\n')"

aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true

# Network
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text --region "$AWS_REGION" | tr -d '\r\n')"
SUBNETS="$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" \
  --query 'Subnets[*].SubnetId' --output text --region "$AWS_REGION" | tr '\t' ',' | tr -d '\r\n')"
SUBNET1="$(echo "$SUBNETS" | cut -d, -f1)"
SUBNET2="$(echo "$SUBNETS" | cut -d, -f2)"
if [[ -z "$SUBNET2" ]]; then SUBNET2="$SUBNET1"; fi

# Security groups
ALB_SG="$(aws ec2 describe-security-groups --filters Name=group-name,Values="${PROJECT}-alb-sg" Name=vpc-id,Values="$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$AWS_REGION" 2>/dev/null | tr -d '\r\n')"
if [[ -z "$ALB_SG" || "$ALB_SG" == "None" ]]; then
  ALB_SG="$(aws ec2 create-security-group --group-name "${PROJECT}-alb-sg" \
    --description "ALB for ${PROJECT} API" --vpc-id "$VPC_ID" --region "$AWS_REGION" \
    --query GroupId --output text | tr -d '\r\n')"
  aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
  aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
fi

ECS_SG="$(aws ec2 describe-security-groups --filters Name=group-name,Values="${PROJECT}-ecs-sg" Name=vpc-id,Values="$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$AWS_REGION" 2>/dev/null | tr -d '\r\n')"
if [[ -z "$ECS_SG" || "$ECS_SG" == "None" ]]; then
  ECS_SG="$(aws ec2 create-security-group --group-name "${PROJECT}-ecs-sg" \
    --description "ECS tasks for ${PROJECT} API" --vpc-id "$VPC_ID" --region "$AWS_REGION" \
    --query GroupId --output text | tr -d '\r\n')"
  aws ec2 authorize-security-group-ingress --group-id "$ECS_SG" --protocol tcp --port 4000 \
    --source-group "$ALB_SG" --region "$AWS_REGION"
fi

# ALB
ALB_ARN="$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$AWS_REGION" \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo None)"
ALB_ARN="$(echo "$ALB_ARN" | tr -d '\r\n')"
if [[ -z "$ALB_ARN" || "$ALB_ARN" == "None" ]]; then
  ALB_ARN="$(aws elbv2 create-load-balancer --name "$ALB_NAME" --type application \
    --subnets "$SUBNET1" "$SUBNET2" \
    --security-groups "$ALB_SG" --region "$AWS_REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text | tr -d '\r\n')"
fi
ALB_DNS="$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --region "$AWS_REGION" \
  --query 'LoadBalancers[0].DNSName' --output text | tr -d '\r\n')"

TG_ARN="$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$AWS_REGION" \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo None)"
TG_ARN="$(echo "$TG_ARN" | tr -d '\r\n')"
if [[ -z "$TG_ARN" || "$TG_ARN" == "None" ]]; then
  TG_ARN="$(aws elbv2 create-target-group --name "$TG_NAME" --protocol HTTP --port 4000 \
    --vpc-id "$VPC_ID" --target-type ip --health-check-path /api/health \
    --region "$AWS_REGION" --query 'TargetGroups[0].TargetGroupArn' --output text | tr -d '\r\n')"
fi

LISTENER="$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$AWS_REGION" \
  --query 'Listeners[?Port==`80`].ListenerArn | [0]' --output text | tr -d '\r\n')"
if [[ -z "$LISTENER" || "$LISTENER" == "None" ]]; then
  aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" --protocol HTTP --port 80 \
    --default-actions "Type=forward,TargetGroupArn=$TG_ARN" --region "$AWS_REGION"
fi

# ECS cluster
aws ecs create-cluster --cluster-name "$CLUSTER" --region "$AWS_REGION" 2>/dev/null || true

build_secret() {
  local key="$1"
  echo "{\"name\":\"$key\",\"valueFrom\":\"arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/${PROJECT}/prod/${key}\"}"
}

SECRETS_JSON="[
  $(build_secret MONGODB_URI),
  $(build_secret JWT_SECRET),
  $(build_secret JWT_COOKIE_NAME),
  $(build_secret CLIENT_URL),
  $(build_secret SERVER_PUBLIC_URL),
  $(build_secret GOOGLE_CLIENT_ID),
  $(build_secret GOOGLE_CLIENT_SECRET),
  $(build_secret ADMIN_EMAILS),
  $(build_secret ADMIN_ORDER_NOTIFY_EMAIL),
  $(build_secret RAZORPAY_KEY_ID),
  $(build_secret RAZORPAY_KEY_SECRET),
  $(build_secret SMTP_HOST),
  $(build_secret SMTP_PORT),
  $(build_secret SMTP_SECURE),
  $(build_secret SMTP_USER),
  $(build_secret SMTP_PASS),
  $(build_secret SMTP_FROM)
]"

TASK_DEF_FILE="$SCRIPT_DIR/.state/ecs-task-def.json"
cat > "$TASK_DEF_FILE" <<EOF
{
  "family": "${PROJECT}-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "taskRoleArn": "$INSTANCE_ROLE_ARN",
  "containerDefinitions": [{
    "name": "api",
    "image": "$IMAGE_URI",
    "essential": true,
    "portMappings": [{ "containerPort": 4000, "protocol": "tcp" }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "4000"},
      {"name": "S3_UPLOADS_BUCKET", "value": "$UPLOADS_BUCKET"},
      {"name": "AWS_REGION", "value": "$AWS_REGION"}
    ],
    "secrets": $SECRETS_JSON,
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "$LOG_GROUP",
        "awslogs-region": "$AWS_REGION",
        "awslogs-stream-prefix": "api"
      }
    }
  }]
}
EOF

TASK_DEF_ARN="$(aws ecs register-task-definition --cli-input-json "$(cat "$TASK_DEF_FILE")" --region "$AWS_REGION" \
  --query 'taskDefinition.taskDefinitionArn' --output text | tr -d '\r\n')"

SERVICE_ARN="$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --region "$AWS_REGION" \
  --query 'services[0].serviceArn' --output text 2>/dev/null || echo None)"
SERVICE_ARN="$(echo "$SERVICE_ARN" | tr -d '\r\n')"
if [[ -z "$SERVICE_ARN" || "$SERVICE_ARN" == "None" ]]; then
  aws ecs create-service --cluster "$CLUSTER" --service-name "$SERVICE" \
    --task-definition "$TASK_DEF_ARN" --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=api,containerPort=4000" \
    --region "$AWS_REGION"
else
  aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
    --task-definition "$TASK_DEF_ARN" --force-new-deployment --region "$AWS_REGION"
fi

echo "Waiting for service stable..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$AWS_REGION"

jq --arg url "$ALB_DNS" --arg arn "$ALB_ARN" \
  '. + {apiOriginHost: $url, apiOriginType: "alb", ecsCluster: "'"$CLUSTER"'", ecsService: "'"$SERVICE"'"}' \
  "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

echo "ALB API URL: http://${ALB_DNS}"
echo "Health: http://${ALB_DNS}/api/health"
