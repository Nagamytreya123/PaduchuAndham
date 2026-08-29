# PaduchuAndham AWS deployment (PowerShell)
# Requires: AWS CLI v2, Docker Desktop running, jq (optional)
param(
  [ValidateSet('provision','secrets','api','uploads','frontend','dns','smoke','all')]
  [string]$Step = 'all',
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env'),
  [string]$BaseUrl = 'https://www.paduchuandham.com'
)

$ErrorActionPreference = 'Stop'
$InfraDir = $PSScriptRoot
$RootDir = Resolve-Path (Join-Path $InfraDir '..')

$configEnv = Join-Path $InfraDir 'config.env'
if (Test-Path $configEnv) {
  Get-Content $configEnv | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim() -Scope Script
    }
  }
}

if (-not $AWS_REGION) { $AWS_REGION = 'ap-south-1' }
if (-not $PROJECT) { $PROJECT = 'paduchuandham' }

function Invoke-BashStep {
  param([string]$Script)
  $bash = Get-Command bash -ErrorAction SilentlyContinue
  if ($bash) {
    bash $Script
  } else {
    Write-Error "Git Bash required to run $Script, or run steps manually from infra/README.md"
  }
}

switch ($Step) {
  'provision' { Invoke-BashStep (Join-Path $InfraDir 'provision.sh') }
  'secrets' {
    if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }
    bash (Join-Path $InfraDir 'set-secrets.sh') $EnvFile
  }
  'api' { Invoke-BashStep (Join-Path $InfraDir 'deploy-api.sh') }
  'uploads' { Invoke-BashStep (Join-Path $InfraDir 'migrate-uploads.sh') }
  'frontend' { Invoke-BashStep (Join-Path $InfraDir 'deploy-frontend.sh') }
  'dns' { Invoke-BashStep (Join-Path $InfraDir 'dns-cutover.sh') }
  'smoke' {
    Invoke-BashStep (Join-Path $InfraDir 'smoke-test.sh')
    bash (Join-Path $InfraDir 'smoke-test.sh') $BaseUrl
  }
  'all' {
    Invoke-BashStep (Join-Path $InfraDir 'provision.sh')
    if (Test-Path $EnvFile) { bash (Join-Path $InfraDir 'set-secrets.sh') $EnvFile }
    Invoke-BashStep (Join-Path $InfraDir 'deploy-api.sh')
    Invoke-BashStep (Join-Path $InfraDir 'migrate-uploads.sh')
    Invoke-BashStep (Join-Path $InfraDir 'deploy-frontend.sh')
    Invoke-BashStep (Join-Path $InfraDir 'dns-cutover.sh')
  }
}

Write-Host "Done: $Step"
