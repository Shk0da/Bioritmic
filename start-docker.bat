@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo ========================================
echo   Bioritmic - Docker (full stack)
echo ========================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy /Y .env.example .env >nul
    )
)

echo [1/2] Building and starting all services...
docker compose up --build -d
if errorlevel 1 (
    echo Failed to start stack. Check: docker compose logs
    exit /b 1
)

echo.
echo [2/2] Waiting for services to become healthy...
set READY=0
for /l %%i in (1,1,120) do (
    docker compose ps --format "{{.Name}} {{.Health}}" 2>nul | findstr /i "unhealthy starting" >nul 2>&1
    if errorlevel 1 (
        docker compose ps --format "{{.Name}} {{.Status}}" 2>nul | findstr /i "Up" >nul 2>&1
        if not errorlevel 1 (
            set READY=1
            goto stack_ready
        )
    )
    timeout /t 3 /nobreak >nul
)
:stack_ready

echo.
docker compose ps
echo.
echo ========================================
echo   Stack is running!
echo ========================================
echo.
echo   App:        http://localhost:4200
echo   API proxy:  http://localhost:4200/api/v1/
echo   Swagger:    http://localhost:4200/swagger-ui.html
echo   PostgreSQL: localhost:5432
echo   MinIO:      http://localhost:9341
echo   SMTP:       localhost:587
echo.
echo   Logs:       docker compose logs -f
echo   Stop:       docker compose down
echo.
