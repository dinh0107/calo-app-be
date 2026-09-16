# Chay 1 lan tren VPS — sau do dong PowerShell van OK
# powershell -ExecutionPolicy Bypass -File .\pm2-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> Stop manual node (neu co)"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "==> Install pm2"
npm install -g pm2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "dist\index.js")) {
  Write-Host "==> Build"
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "==> Start with PM2"
pm2 delete calovision 2>$null
pm2 start ecosystem.config.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

pm2 save

Write-Host "==> Register Windows startup"
pm2 startup
Write-Host "Neu pm2 startup in lenh — copy chay dung lenh do (Run as Admin)."

Write-Host ""
Write-Host "Kiem tra:"
pm2 status
try {
  $r = Invoke-WebRequest http://127.0.0.1:5001/api/health -UseBasicParsing
  Write-Host "Health:" $r.Content
} catch {
  Write-Host "Health FAIL:" $_.Exception.Message
}

Write-Host ""
Write-Host "OK. Co the DONG PowerShell. Web van chay."
Write-Host "Quan ly sau nay: pm2 status | pm2 logs calovision | pm2 restart calovision"
