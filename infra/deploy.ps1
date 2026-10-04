# Deploys stack "stayledger" in ap-south-1.
# Requires AWS CLI v2, a default VPC, and an EC2 key pair named stayledger.
$ErrorActionPreference = "Stop"
$Region = "ap-south-1"
$Stack = "stayledger"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI is not installed. Install AWS CLI v2, run 'aws configure', then run this script again."
}

$vpc = aws ec2 describe-vpcs --region $Region --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text
if (-not $vpc -or $vpc -eq "None") {
  throw "No default VPC in $Region. Create one before deploying. Do not add a NAT gateway."
}

$subnetJson = aws ec2 describe-subnets --region $Region --filters "Name=vpc-id,Values=$vpc" --output json | ConvertFrom-Json
$public = @($subnetJson.Subnets | Where-Object { $_.MapPublicIpOnLaunch -eq $true })
$byAz = $public | Group-Object AvailabilityZone
if ($byAz.Count -lt 2) {
  throw "RDS needs public subnets in two availability zones. Found $($byAz.Count)."
}
$subnetA = $byAz[0].Group[0].SubnetId
$subnetB = $byAz[1].Group[0].SubnetId

$myIp = (Invoke-RestMethod "https://checkip.amazonaws.com").Trim()

$passwordFile = Join-Path $PSScriptRoot ".db-password"
$existing = aws ssm get-parameter --region $Region --name /stayledger/db-password --with-decryption --query Parameter.Value --output text 2>$null
if ($LASTEXITCODE -ne 0 -or -not $existing -or $existing -eq "None") {
  if (Test-Path $passwordFile) {
    $existing = (Get-Content $passwordFile -Raw).Trim()
  } else {
    $chars = ([char[]](48..57 + 65..90 + 97..122))
    $existing = -join (1..32 | ForEach-Object { $chars | Get-Random })
    Set-Content -Path $passwordFile -Value $existing -NoNewline
  }
  aws ssm put-parameter --region $Region --name /stayledger/db-password --type SecureString --value $existing --overwrite | Out-Null
}

$versions = aws rds describe-db-engine-versions --region $Region --engine postgres --output json | ConvertFrom-Json
$engine = $versions.DBEngineVersions |
  Where-Object { $_.EngineVersion -match "^16\." } |
  Sort-Object { [version]$_.EngineVersion } |
  Select-Object -Last 1 -ExpandProperty EngineVersion
if (-not $engine) { throw "No PostgreSQL 16 version is available in $Region." }

aws cloudformation deploy `
  --region $Region `
  --stack-name $Stack `
  --template-file (Join-Path $PSScriptRoot "template.yaml") `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
    KeyName=stayledger `
    "MyIp=$myIp/32" `
    "VpcId=$vpc" `
    "SubnetA=$subnetA" `
    "SubnetB=$subnetB" `
    "DbPassword=$existing" `
    ApiKey=stayledger-demo-key `
    "EngineVersion=$engine"

aws cloudformation describe-stacks --region $Region --stack-name $Stack --query "Stacks[0].Outputs" --output table
Write-Host "RDS takes several minutes, then user-data clones the repo. CREATE_COMPLETE does not mean the app is up."
Write-Host "SSH in and read /var/log/stayledger-bootstrap.log, then curl the ApiUrl."
