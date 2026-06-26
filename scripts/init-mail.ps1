param(
    [string]$Password = $(if ($env:MAIL_PASSWORD) { $env:MAIL_PASSWORD } else { "changeme" })
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $Root

Write-Host "Starting mail server..."
docker compose up -d mail | Out-Null

Write-Host "Waiting for SMTP on port 587..."
$ready = $false
for ($i = 1; $i -le 90; $i++) {
    $tcp = Test-NetConnection -ComputerName localhost -Port 587 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Error "Mail server did not become ready on port 587 within 180 seconds."
}

Write-Host "Ensuring mailbox noreply@bioritmic.ru exists..."
docker compose exec -T mail setup email add "noreply@bioritmic.ru" $Password 2>$null
if ($LASTEXITCODE -ne 0) {
    docker compose exec -T mail setup email update "noreply@bioritmic.ru" $Password 2>$null
}

Write-Host "Mail server ready (SMTP localhost:587, web admin not included — use docker exec for setup)."
Write-Host "DKIM: docker compose exec mail setup config dkim domain bioritmic.ru"
