# Deploy API Gateway + Lambda + DynamoDB + S3 (Windows)
param(
  [string]$EnvFile = (Join-Path $PSScriptRoot '.env.production'),
  [string]$StackName = 'paduchuandham-serverless',
  [string]$Region = 'ap-south-1'
)

$ErrorActionPreference = 'Stop'
$RootDir = Resolve-Path (Join-Path $PSScriptRoot '..')
$SamDir = Join-Path $PSScriptRoot 'sam'

if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

function Get-Var([string]$Key, [string]$Default = '') {
  if ($vars.ContainsKey($Key) -and $vars[$Key]) { return $vars[$Key] }
  return $Default
}

$uploadsBucket = if ($vars.UPLOADS_BUCKET) { $vars.UPLOADS_BUCKET } else { 'paduchuandham-uploads-474476202047' }
$frontendBucket = if ($vars.FRONTEND_BUCKET) { $vars.FRONTEND_BUCKET } else { 'paduchuandham-frontend-474476202047' }

Write-Host '==> SAM build'
Push-Location $SamDir
sam build --use-container
if ($LASTEXITCODE -ne 0) { throw 'sam build failed' }

$overrides = @(
  "ClientUrl=$(Get-Var 'CLIENT_URL' 'https://www.paduchuandham.com')"
  "JwtSecret=$(Get-Var 'JWT_SECRET')"
  "GoogleClientId=$(Get-Var 'GOOGLE_CLIENT_ID')"
  "GoogleClientSecret=$(Get-Var 'GOOGLE_CLIENT_SECRET')"
  "AdminEmails=$(Get-Var 'ADMIN_EMAILS')"
  "AdminOrderNotifyEmail=$(Get-Var 'ADMIN_ORDER_NOTIFY_EMAIL')"
  "RazorpayKeyId=$(Get-Var 'RAZORPAY_KEY_ID')"
  "RazorpayKeySecret=$(Get-Var 'RAZORPAY_KEY_SECRET')"
  "RazorpayWebhookSecret=$(Get-Var 'RAZORPAY_WEBHOOK_SECRET')"
  "SmtpHost=$(Get-Var 'SMTP_HOST')"
  "SmtpPort=$(Get-Var 'SMTP_PORT' '587')"
  "SmtpSecure=$(Get-Var 'SMTP_SECURE' 'false')"
  "SmtpUser=$(Get-Var 'SMTP_USER')"
  "SmtpPass=$(Get-Var 'SMTP_PASS')"
  "SmtpFrom=$(Get-Var 'SMTP_FROM')"
  "RedisUrl=$(Get-Var 'REDIS_URL')"
  "UploadsBucketName=$uploadsBucket"
  "FrontendBucketName=$frontendBucket"
)

Write-Host '==> SAM deploy'
python (Join-Path $SamDir 'gen-deploy-params.py')
sam deploy `
  --stack-name $StackName `
  --region $Region `
  --capabilities CAPABILITY_IAM `
  --resolve-image-repos `
  --resolve-s3 `
  --parameter-overrides file://.deploy-params.yaml `
  --no-confirm-changeset `
  --no-fail-on-empty-changeset
if ($LASTEXITCODE -ne 0) { throw 'sam deploy failed' }
Pop-Location

$apiUrl = (python -m awscli cloudformation describe-stacks --stack-name $StackName --region $Region `
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text).Trim()

Write-Host "==> Build frontend (VITE_API_URL=$apiUrl)"
Push-Location (Join-Path $RootDir 'client')
$env:VITE_API_URL = $apiUrl
npm ci
npm run build
if ($LASTEXITCODE -ne 0) { throw 'client build failed' }

Write-Host "==> Sync frontend to s3://$frontendBucket"
python -m awscli s3 sync dist/ "s3://$frontendBucket/" --delete --region $Region
python -m awscli s3 cp dist/index.html "s3://$frontendBucket/index.html" --cache-control no-cache --region $Region
Pop-Location

Write-Host ''
Write-Host "API Gateway URL: $apiUrl"
Write-Host "Frontend bucket: $frontendBucket"
Write-Host 'Run: npm run migrate:mongo-to-dynamo --prefix server'
