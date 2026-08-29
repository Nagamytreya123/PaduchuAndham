#!/usr/bin/env bash
# Print DNS cutover instructions and optional Route53 alias records.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
STATE_FILE="$SCRIPT_DIR/.state/provision.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Run provision + deploy scripts first"
  exit 1
fi

DOMAIN="$(jq -r .domain "$STATE_FILE")"
DOMAIN_ALTERNATE="$(jq -r .domainAlternate "$STATE_FILE")"
CF_DOMAIN="$(jq -r .cloudFrontDomain "$STATE_FILE")"
CERT_ARN="$(jq -r .certArn "$STATE_FILE")"
ACM_REGION="${ACM_REGION:-us-east-1}"

echo "========================================"
echo "DNS CUT OVER CHECKLIST"
echo "========================================"
echo ""
echo "1. ACM certificate validation (if not ISSUED):"
aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$ACM_REGION" \
  --query '{Status:Certificate.Status,Validation:Certificate.DomainValidationOptions[*].{Domain:DomainName,Record:ResourceRecord}}' \
  --output table 2>/dev/null || echo "Check ACM in console"
echo ""
echo "2. Point both domains to CloudFront:"
echo "   $DOMAIN  -> CNAME $CF_DOMAIN"
echo "   $DOMAIN_ALTERNATE -> CNAME $CF_DOMAIN"
echo ""
echo "3. Google Cloud Console — Authorized redirect URI:"
echo "   https://${DOMAIN}/api/auth/google/callback"
echo ""
echo "4. Razorpay webhook (if enabled):"
echo "   https://${DOMAIN}/api/webhooks/razorpay"
echo ""
echo "5. MongoDB Atlas — Network Access: allow 0.0.0.0/0 (or App Runner IPs on paid tier)"
echo ""
echo "6. Update SSM CLIENT_URL and SERVER_PUBLIC_URL to https://${DOMAIN}"
echo ""
echo "7. After DNS propagates, verify:"
echo "   curl -fsSL https://${DOMAIN}/api/health"
echo ""
echo "8. Keep Vercel/Render live 48h for rollback; then remove vercel.json rewrites."
