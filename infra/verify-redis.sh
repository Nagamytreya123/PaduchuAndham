#!/usr/bin/env bash
# Verify Redis cache status via /api/health.
set -euo pipefail

BASE_URL="${1:-https://www.paduchuandham.com}"

echo "Checking Redis status at $BASE_URL/api/health"

body="$(curl -fsSL "$BASE_URL/api/health")"
echo "$body" | jq .

redis_enabled="$(echo "$body" | jq -r '.redis.enabled // false')"
cache_enabled="$(echo "$body" | jq -r '.redis.cacheEnabled // false')"
redis_status="$(echo "$body" | jq -r '.redis.status // "unknown"')"

if [[ "$redis_enabled" != "true" ]]; then
  echo "WARN: REDIS_URL not configured in production (redis.enabled=false)."
  exit 0
fi

if [[ "$cache_enabled" == "true" && "$redis_status" == "read-write" ]]; then
  echo "OK: Redis read-write cache is active."
  exit 0
fi

echo "WARN: Redis is enabled but catalog cache is not active (status=$redis_status, cacheEnabled=$cache_enabled)."
echo "Use a read-write Upstash TCP URL for REDIS_URL."
exit 1
