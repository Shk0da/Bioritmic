@echo off
setlocal

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"
set COMPOSE_FILE=docker-compose.yml;docker-compose.prod.yml

if "%PROD_LOWMEM%"=="1" (
    set COMPOSE_FILE=docker-compose.yml;docker-compose.prod.yml;docker-compose.lowmem.yml
)

echo ========================================
echo   Bioritmic - Stop Production (Docker)
echo ========================================
echo.

docker compose ps --status running -q 2>nul | findstr /r "." >nul 2>&1
if not errorlevel 1 (
    docker compose down
    echo   Production container stopped
) else (
    docker compose ps -a -q 2>nul | findstr /r "." >nul 2>&1
    if not errorlevel 1 (
        docker compose down
        echo   Production stack removed (was not running)
    ) else (
        echo   Production stack was not running
    )
)

echo.
echo   Data volumes are kept (PostgreSQL, MinIO, Let's Encrypt).
echo   Remove volumes: docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
echo.
echo Done.
