#!/usr/bin/env bash
# Deploy API Gateway + Lambda + DynamoDB + S3 via AWS SAM
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"

ENV_FILE="${1:-$ROOT_DIR/infra/.env.production}"
STACK_NAME="${STACK_NAME:-paduchuandham-serverless}"
REGION="${AWS_REGION:-ap-south-1}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

JWT_SECRET="$(get_env JWT_SECRET)"
CLIENT_URL="$(get_env CLIENT_URL)"
MONGODB_URI="$(get_env MONGODB_URI)"
GOOGLE_CLIENT_ID="$(get_env GOOGLE_CLIENT_ID)"
GOOGLE_CLIENT_SECRET="$(get_env GOOGLE_CLIENT_SECRET)"
ADMIN_EMAILS="$(get_env ADMIN_EMAILS)"
ADMIN_ORDER_NOTIFY_EMAIL="$(get_env ADMIN_ORDER_NOTIFY_EMAIL)"
RAZORPAY_KEY_ID="$(get_env RAZORPAY_KEY_ID)"
RAZORPAY_KEY_SECRET="$(get_env RAZORPAY_KEY_SECRET)"
RAZORPAY_WEBHOOK_SECRET="$(get_env RAZORPAY_WEBHOOK_SECRET)"
SMTP_HOST="$(get_env SMTP_HOST)"
SMTP_PORT="$(get_env SMTP_PORT)"
SMTP_SECURE="$(get_env SMTP_SECURE)"
SMTP_USER="$(get_env SMTP_USER)"
SMTP_PASS="$(get_env SMTP_PASS)"
SMTP_FROM="$(get_env SMTP_FROM)"
REDIS_URL="$(get_env REDIS_URL)"

UPLOADS_BUCKET="${UPLOADS_BUCKET:-paduchuandham-uploads-474476202047}"
FRONTEND_BUCKET="${FRONTEND_BUCKET:-paduchuandham-frontend-474476202047}"

echo "==> Build server"
cd "$ROOT_DIR/server"
npm ci
npm run build

if ! command -v sam >/dev/null 2>&1; then
  echo "SAM CLI not found. Install: pip install aws-sam-cli"
  exit 1
fi

echo "==> SAM deploy (requires Docker)"
cd "$ROOT_DIR/infra/sam"
sam build --use-container
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-image-repos \
  --parameter-overrides \
    "ClientUrl=$CLIENT_URL" \
    "JwtSecret=$JWT_SECRET" \
    "MongoDbUri=$MONGODB_URI" \
    "GoogleClientId=$GOOGLE_CLIENT_ID" \
    "GoogleClientSecret=$GOOGLE_CLIENT_SECRET" \
    "AdminEmails=$ADMIN_EMAILS" \
    "AdminOrderNotifyEmail=$ADMIN_ORDER_NOTIFY_EMAIL" \
    "RazorpayKeyId=$RAZORPAY_KEY_ID" \
    "RazorpayKeySecret=$RAZORPAY_KEY_SECRET" \
    "RazorpayWebhookSecret=$RAZORPAY_WEBHOOK_SECRET" \
    "SmtpHost=$SMTP_HOST" \
    "SmtpPort=$SMTP_PORT" \
    "SmtpSecure=$SMTP_SECURE" \
    "SmtpUser=$SMTP_USER" \
    "SmtpPass=$SMTP_PASS" \
    "SmtpFrom=$SMTP_FROM" \
    "RedisUrl=$REDIS_URL" \
    "UploadsBucketName=$UPLOADS_BUCKET" \
    "FrontendBucketName=$FRONTEND_BUCKET" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

API_URL="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text | tr -d '\r\n')"

echo "==> Build & upload frontend to $FRONTEND_BUCKET (VITE_API_URL=$API_URL)"
cd "$ROOT_DIR/client"
npm ci
export VITE_API_URL="$API_URL"
npm run build
aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/" --delete --region "$REGION"
aws s3 cp dist/index.html "s3://${FRONTEND_BUCKET}/index.html" \
  --cache-control "no-cache" --region "$REGION"

echo ""
echo "API Gateway URL: $API_URL"
echo "Frontend bucket: $FRONTEND_BUCKET"
echo "Run migration: npm run migrate:mongo-to-dynamo --prefix server"
