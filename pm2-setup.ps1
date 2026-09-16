# One-time PM2 setup for CaloVision on Windows/Plesk
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File .\pm2-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> Stop manual node processes"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "==> Install pm2 globally"
npm install -g pm2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "dist\index.js")) {
  Write-Host "==> Build missing dist"
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path "ecosystem.config.cjs")) {
  Write-Error "Missing ecosystem.config.cjs"
}

Write-Host "==> Start app with PM2"
pm2 delete calovision 2>$null
pm2 start ecosystem.config.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

pm2 save

Write-Host "==> Enable PM2 on Windows startup"
pm2 startup

Write-Host ""
Write-Host "If pm2 startup printed a command, run that command as Admin."
Write-Host ""

pm2 status

try {
  $r = Invoke-WebRequest http://127.0.0.1:5001/api/health -UseBasicParsing
  Write-Host "Health OK:"
  Write-Host $r.Content
} catch {
  Write-Host "Health FAIL:" $_.Exception.Message
}

Write-Host ""
Write-Host "DONE. You can close PowerShell. Site should stay online."
Write-Host "Later: pm2 status   pm2 logs calovision   pm2 restart calovision"
