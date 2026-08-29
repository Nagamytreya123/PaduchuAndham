# AWS deployment for PaduchuAndham

Migrate from Vercel + Render to **CloudFront + S3 + App Runner** with MongoDB Atlas.

## Prerequisites

- AWS account with CLI configured (`aws sts get-caller-identity`)
- Docker (for API image build)
- `jq` (GitHub Actions installs it; on Windows use Git Bash or WSL)
- Domain DNS access for `paduchuandham.com` / `www.paduchuandham.com`

## Quick start

```bash
# 1. Copy and edit deployment config
cp infra/config.env.example infra/config.env

# 2. Provision AWS resources (S3, ECR, ACM, IAM, SSM placeholders)
bash infra/provision.sh

# 3. Validate ACM certificate via DNS (see AWS Console → ACM us-east-1)

# 4. Push secrets from local .env (set CLIENT_URL=https://www.paduchuandham.com first)
bash infra/set-secrets.sh .env

# 5. Build & deploy API to App Runner
bash infra/deploy-api.sh

# 6. Migrate legacy Render uploads to S3
bash infra/migrate-uploads.sh

# 7. Build client, sync S3, create CloudFront
bash infra/deploy-frontend.sh

# 8. DNS + third-party cutover checklist
bash infra/dns-cutover.sh

# 9. Smoke test after DNS propagates
bash infra/smoke-test.sh https://www.paduchuandham.com
```

## Architecture

| Path | Origin |
|------|--------|
| `/*` | S3 (React SPA) |
| `/api/*` | App Runner (Express) |
| `/uploads/*` | S3 (combo images) |

Product images remain base64 in MongoDB (lift-and-shift). Jewellery combo uploads use S3 when `S3_UPLOADS_BUCKET` is set.

## GitHub Actions

Add repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Push to `main` runs provision → deploy-api → deploy-frontend.

## Third-party updates (manual)

1. **Google OAuth** — redirect URI: `https://www.paduchuandham.com/api/auth/google/callback`
2. **Razorpay** — webhook: `https://www.paduchuandham.com/api/webhooks/razorpay`
3. **MongoDB Atlas** — Network Access: `0.0.0.0/0` (free tier)
4. Rotate secrets before cutover (JWT, Google, Razorpay, SMTP, MongoDB password)

## Rollback

Revert DNS to Vercel/Render. Atlas data unchanged.
