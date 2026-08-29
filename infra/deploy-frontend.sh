#!/usr/bin/env bash
# Build client, sync to S3, create/update CloudFront with SPA + API + uploads behaviors.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/aws-cli.sh"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$SCRIPT_DIR/.state/provision.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Run infra/provision.sh and infra/deploy-api.sh first"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/config.env"
fi

AWS_REGION="$(jq -r .awsRegion "$STATE_FILE")"
ACM_REGION="${ACM_REGION:-us-east-1}"
FRONTEND_BUCKET="$(jq -r .frontendBucket "$STATE_FILE")"
UPLOADS_BUCKET="$(jq -r .uploadsBucket "$STATE_FILE")"
CERT_ARN="$(jq -r .certArn "$STATE_FILE")"
DOMAIN="$(jq -r .domain "$STATE_FILE")"
DOMAIN_ALTERNATE="$(jq -r .domainAlternate "$STATE_FILE")"
APPRUNNER_URL="$(jq -r .apprunnerServiceUrl "$STATE_FILE" | tr -d '\r\n')"
API_ORIGIN_HOST="$(jq -r .apiOriginHost "$STATE_FILE" | tr -d '\r\n')"
PROJECT="$(jq -r .ecrRepo "$STATE_FILE" | sed 's/-api$//' | tr -d '\r\n')"

API_ORIGIN="${API_ORIGIN_HOST}"
if [[ -z "$API_ORIGIN" || "$API_ORIGIN" == "null" ]]; then
  API_ORIGIN="${APPRUNNER_URL}"
fi

if [[ -z "$API_ORIGIN" || "$API_ORIGIN" == "null" ]]; then
  echo "API origin missing — run infra/deploy-api.sh or infra/deploy-api-ecs.sh first"
  exit 1
fi

echo "==> Build frontend"
cd "$ROOT_DIR/client"
npm ci
# Production build: same-origin API via CloudFront (no VITE_API_URL)
unset VITE_API_URL
npm run build

echo "==> Sync frontend to S3"
aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" --region "$AWS_REGION"
aws s3 cp dist/index.html "s3://${FRONTEND_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" --region "$AWS_REGION"

ORIGIN_ID_SPA="spa-s3"
ORIGIN_ID_API="api-apprunner"
ORIGIN_ID_UPLOADS="uploads-s3"
CALLER_REF="${PROJECT}-cf-$(date +%s)"

create_oac() {
  local name="$1"
  aws cloudfront create-origin-access-control --origin-access-control-config "{
    \"Name\": \"${name}\",
    \"Description\": \"OAC for ${name}\",
    \"SigningProtocol\": \"sigv4\",
    \"SigningBehavior\": \"always\",
    \"OriginAccessControlOriginType\": \"s3\"
  }" --query OriginAccessControl.Id --output text 2>/dev/null || \
  aws cloudfront list-origin-access-controls --query \
    "OriginAccessControlList.Items[?Name=='${name}'].Id | [0]" --output text
}

OAC_SPA="$(create_oac "${PROJECT}-spa-oac" | tr -d '\r\n')"
OAC_UPLOADS="$(create_oac "${PROJECT}-uploads-oac" | tr -d '\r\n')"

CERT_STATUS="$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$ACM_REGION" \
  --query Certificate.Status --output text 2>/dev/null | tr -d '\r\n' || echo PENDING)"

if [[ "$CERT_STATUS" == "ISSUED" ]]; then
  ALIASES_JSON="{\"Quantity\":2,\"Items\":[\"$DOMAIN\",\"$DOMAIN_ALTERNATE\"]}"
  VIEWER_CERT_JSON="{\"ACMCertificateArn\":\"$CERT_ARN\",\"SSLSupportMethod\":\"sni-only\",\"MinimumProtocolVersion\":\"TLSv1.2_2021\"}"
  echo "ACM certificate issued — attaching custom domains"
else
  ALIASES_JSON='{"Quantity":0}'
  VIEWER_CERT_JSON='{"CloudFrontDefaultCertificate":true}'
  echo "ACM certificate $CERT_STATUS — CloudFront will use *.cloudfront.net until DNS validation completes"
fi

DIST_CONFIG_FILE="$SCRIPT_DIR/.state/cloudfront-dist.json"
cat > "$DIST_CONFIG_FILE" <<EOF
{
  "CallerReference": "$CALLER_REF",
  "Comment": "${PROJECT} production",
  "Enabled": true,
  "Aliases": $ALIASES_JSON,
  "ViewerCertificate": $VIEWER_CERT_JSON,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 3,
    "Items": [
      {
        "Id": "$ORIGIN_ID_SPA",
        "DomainName": "${FRONTEND_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
        "OriginAccessControlId": "$OAC_SPA",
        "S3OriginConfig": { "OriginAccessIdentity": "" }
      },
      {
        "Id": "$ORIGIN_ID_API",
        "DomainName": "$API_ORIGIN",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
        }
      },
      {
        "Id": "$ORIGIN_ID_UPLOADS",
        "DomainName": "${UPLOADS_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
        "OriginAccessControlId": "$OAC_UPLOADS",
        "S3OriginConfig": { "OriginAccessIdentity": "" }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "$ORIGIN_ID_SPA",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "$ORIGIN_ID_API",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": { "Quantity": 7, "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"], "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
        "Compress": true,
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b050a1a7bd3",
        "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e29661a"
      },
      {
        "PathPattern": "/uploads/*",
        "TargetOriginId": "$ORIGIN_ID_UPLOADS",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
        "Compress": true,
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 },
      { "ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 }
    ]
  }
}
EOF

DIST_ID="$(aws cloudfront list-distributions --query \
  "DistributionList.Items[?Comment=='${PROJECT} production'].Id | [0]" --output text | tr -d '\r\n')"

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "==> Create CloudFront distribution"
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "$(cat "$DIST_CONFIG_FILE")" \
    --query Distribution.Id --output text | tr -d '\r\n')"
else
  echo "==> Update CloudFront distribution $DIST_ID"
  ETAG="$(aws cloudfront get-distribution-config --id "$DIST_ID" --query ETag --output text | tr -d '\r\n')"
  aws cloudfront update-distribution --id "$DIST_ID" --if-match "$ETAG" \
    --distribution-config "$(cat "$DIST_CONFIG_FILE")"
fi

CF_DOMAIN="$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text | tr -d '\r\n')"

# Bucket policies for OAC
for pair in "$FRONTEND_BUCKET:$OAC_SPA" "$UPLOADS_BUCKET:$OAC_UPLOADS"; do
  BUCKET="${pair%%:*}"
  OAC_ID="${pair##*:}"
  OAC_ARN="arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):origin-access-control/${OAC_ID}"
  POLICY="$(cat <<POL
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": {
      "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/${DIST_ID}" }
    }
  }]
}
POL
)"
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$POLICY"
done

jq --arg id "$DIST_ID" --arg domain "$CF_DOMAIN" \
  '. + {cloudFrontDistributionId: $id, cloudFrontDomain: $domain}' "$STATE_FILE" > "${STATE_FILE}.tmp" \
  && mv "${STATE_FILE}.tmp" "$STATE_FILE"

echo "CloudFront: https://${CF_DOMAIN}"
echo "Point DNS for $DOMAIN and $DOMAIN_ALTERNATE to ${CF_DOMAIN} (CNAME or Route53 alias)"
