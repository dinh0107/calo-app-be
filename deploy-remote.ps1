# Remote deploy helper (run on VPS after git pull, or via GitHub Actions SSH)
# Usage: powershell -ExecutionPolicy Bypass -File .\deploy-remote.ps1

Set-Location $PSScriptRoot

Write-Host "==> git pull"
git pull origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> npm ci"
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'file:./prod.db' }
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> prisma"
npx prisma generate
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> build"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> pm2 restart"
pm2 describe calovision >$null 2>&1
if ($LASTEXITCODE -eq 0) {
  pm2 restart calovision
} else {
  pm2 start ecosystem.config.cjs
}
pm2 save

Write-Host "DONE"
pm2 status
