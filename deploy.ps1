# CaloVision BE — one-shot deploy on Windows/Plesk host
# Run from app root (folder that contains package.json):
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
  Write-Error "Missing .env — copy .env.example to .env and fill secrets first."
}

Write-Host "==> npm install"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> prisma db push"
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> build (tsc)"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "dist\index.js")) {
  Write-Error "Build failed: dist\index.js not found"
}

Write-Host ""
Write-Host "OK. In Plesk Node.js: set startup file = dist/index.js, then Enable/Restart App."
Write-Host "Health: /api/health   Admin: /admin"
