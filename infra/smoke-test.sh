#!/usr/bin/env bash
# Smoke tests against production URL after cutover.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"

BASE_URL="${1:-https://www.paduchuandham.com}"

echo "Testing $BASE_URL"

curl -fsSL "$BASE_URL/api/health" | jq .
curl -fsSL -o /dev/null -w "SPA index: %{http_code}\n" "$BASE_URL/"
curl -fsSL -o /dev/null -w "Products API: %{http_code}\n" "$BASE_URL/api/products?limit=1"
curl -fsSL -o /dev/null -w "Categories API: %{http_code}\n" "$BASE_URL/api/categories"

echo "Smoke tests passed (HTTP 200). Manually verify login, checkout, admin upload."
