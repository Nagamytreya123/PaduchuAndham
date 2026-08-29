# Third-party cutover checklist (run after CloudFront is live)

## Before DNS switch

- [ ] ACM certificate **Issued** in `us-east-1` (DNS validation records added at registrar)
- [ ] SSM parameters set via `bash infra/set-secrets.sh .env` with:
  - `CLIENT_URL=https://www.paduchuandham.com`
  - `SERVER_PUBLIC_URL=https://www.paduchuandham.com`
- [ ] App Runner health: `https://<apprunner-url>/api/health` returns `ok: true`
- [ ] CloudFront smoke test on `*.cloudfront.net` URL (before custom domain)

## DNS (registrar or Route 53)

| Host | Type | Value |
|------|------|-------|
| `www.paduchuandham.com` | CNAME | `<cloudfront-domain>.cloudfront.net` |
| `paduchuandham.com` | CNAME or ALIAS | same CloudFront domain |

Lower TTL to 300s before cutover; restore to 3600 after stable.

## Google Cloud Console

1. APIs & Services → Credentials → OAuth 2.0 Client
2. Authorized JavaScript origins: `https://www.paduchuandham.com`
3. Authorized redirect URIs: `https://www.paduchuandham.com/api/auth/google/callback`

## Razorpay

- Webhook URL: `https://www.paduchuandham.com/api/webhooks/razorpay`
- Update webhook secret in SSM if changed

## MongoDB Atlas

1. Network Access → Add IP `0.0.0.0/0` (free tier; App Runner has dynamic egress)
2. Confirm cluster region near `ap-south-1`

## Post-cutover validation

```bash
bash infra/smoke-test.sh https://www.paduchuandham.com
```

Manual checks:

- [ ] Google login
- [ ] Email login / signup
- [ ] Browse products (large images load from API, not Vercel)
- [ ] Cart + Razorpay test checkout
- [ ] Admin combo image upload (S3)
- [ ] Order confirmation email

## Decommission (after 48h stable)

- [ ] Remove Vercel project or disable domain
- [ ] Delete Render web service
- [ ] Remove `client/vercel.json` proxy rewrites (optional; kept for rollback)

## Rollback

Point DNS back to Vercel. Restore Render `CLIENT_URL` to Vercel URL. No Atlas migration needed.
