@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"
set COMPOSE_FILE=docker-compose.yml;docker-compose.lowmem.yml

echo ========================================
echo   Bioritmic - Docker (single container)
echo ========================================
echo.

set UI_PORT=2399
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy /Y .env.example .env >nul
    )
)
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "UI_PORT=" ".env"`) do set "UI_PORT=%%b"
)

echo [1/3] Cleaning up orphan containers...
docker rm -f bioritmic-redis >nul 2>&1
docker container prune -f >nul 2>&1

echo [2/3] Building and starting...
docker compose up --build -d
if errorlevel 1 (
    echo Failed to start. Check: docker compose logs bioritmic
    exit /b 1
)

echo.
echo [3/3] Waiting for health check...
timeout /t 30 /nobreak >nul

docker compose ps
echo.
echo ========================================
echo   Stack is running!
echo ========================================
echo.
echo   App:  http://localhost:%UI_PORT%
echo   Logs: docker compose logs -f bioritmic
echo   Stop: docker compose down
echo.
