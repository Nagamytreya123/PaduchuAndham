#!/usr/bin/env bash
# Sync secrets from a local .env file into AWS SSM Parameter Store (never commit .env).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
ENV_FILE="${1:-$(cd "$SCRIPT_DIR/.." && pwd)/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Usage: $0 [path-to-.env]"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/config.env"
fi

: "${AWS_REGION:=ap-south-1}"
: "${PROJECT:=paduchuandham}"

KEYS=(
  MONGODB_URI JWT_SECRET JWT_COOKIE_NAME CLIENT_URL SERVER_PUBLIC_URL
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ADMIN_EMAILS ADMIN_ORDER_NOTIFY_EMAIL
  RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET
  SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM REDIS_URL
)

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

for key in "${KEYS[@]}"; do
  val="$(get_env "$key")"
  if [[ -n "$val" ]]; then
    val_file="$SCRIPT_DIR/.state/secret-${key}.tmp"
    printf '%s' "$val" > "$val_file"
    if [[ "$val_file" == /mnt/* ]]; then
      val_arg="file://c:${val_file#/mnt/c}"
    else
      val_arg="file://$val_file"
    fi
    aws ssm put-parameter --name "/${PROJECT}/prod/${key}" \
      --type SecureString --value "$val_arg" --overwrite --region "$AWS_REGION"
    rm -f "$val_file"
    echo "Set /${PROJECT}/prod/${key}"
  fi
done

echo "Done. Update CLIENT_URL and SERVER_PUBLIC_URL to https://www.paduchuandham.com before deploy-api."
