#!/usr/bin/env bash
# Download legacy /uploads paths listed by the API and sync to S3 uploads bucket.
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

AWS_REGION="$(jq -r .awsRegion "$STATE_FILE")"
UPLOADS_BUCKET="$(jq -r .uploadsBucket "$STATE_FILE")"
: "${API_URL:=https://4cntwh9o4m.execute-api.ap-south-1.amazonaws.com}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Fetch jewellery combo list to discover upload paths"
COMBOS_JSON="$(curl -fsSL "${API_URL}/api/jewellery-combos" || echo '{}')"
PATHS="$(echo "$COMBOS_JSON" | jq -r '.combos[]?.images[]? // empty' | grep '^/uploads/' || true)"

if [[ -z "$PATHS" ]]; then
  echo "No /uploads paths found in combo API."
  echo "If you have local server/uploads/, run: aws s3 sync server/uploads/ s3://${UPLOADS_BUCKET}/uploads/"
  exit 0
fi

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  filename="${path#/uploads/}"
  dest="$TMP_DIR/$filename"
  url="${API_URL}${path}"
  echo "Downloading $url"
  curl -fsSL "$url" -o "$dest" || echo "WARN: failed $url"
done <<< "$PATHS"

if [[ -n "$(ls -A "$TMP_DIR" 2>/dev/null)" ]]; then
  aws s3 sync "$TMP_DIR/" "s3://${UPLOADS_BUCKET}/uploads/" --region "$AWS_REGION"
  echo "Synced uploads to s3://${UPLOADS_BUCKET}/uploads/"
else
  echo "No files downloaded"
fi
