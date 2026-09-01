#!/usr/bin/env bash
# Smoke tests against production URL after cutover.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"

BASE_URL="${1:-https://www.paduchuandham.com}"

echo "Testing $BASE_URL"

bench_one() {
  local path="$1"
  curl -fsSL -o /dev/null -w "${path}: %{http_code} %{time_total}s\n" "$BASE_URL$path"
}

curl -fsSL "$BASE_URL/api/health" | jq .
bench_one "/"
bench_one "/api/products?limit=1"
bench_one "/api/categories"
bench_one "/api/site-settings"

echo "Smoke tests passed (HTTP 200). Manually verify login, checkout, admin upload."
