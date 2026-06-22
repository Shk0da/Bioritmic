@echo off
setlocal

set ROOT_DIR=%~dp0

echo Stopping Bioritmic services...

taskkill /FI "WINDOWTITLE eq bioritmic-api" /F >nul 2>&1 && echo   Backend stopped || echo   Backend was not running
taskkill /FI "WINDOWTITLE eq bioritmic-ui" /F >nul 2>&1 && echo   Frontend stopped || echo   Frontend was not running

cd /d "%ROOT_DIR%"
docker compose down >nul 2>&1 && echo   PostgreSQL stopped || echo   PostgreSQL was not running

echo Done.
