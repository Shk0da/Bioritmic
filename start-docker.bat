@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"
set COMPOSE_FILE=docker-compose.yml;docker-compose.lowmem.yml

echo ========================================
echo   Bioritmic - Docker (2 GB RAM profile)
echo ========================================
echo.

set UI_PORT=2399
set API_PORT=6045
set POSTGRES_PORT=5433
set MINIO_CONSOLE_PORT=19001
set MAIL_PORT=2587
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy /Y .env.example .env >nul
    )
)
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "POSTGRES_PORT=" ".env"`) do set "POSTGRES_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "UI_PORT=" ".env"`) do set "UI_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_PORT=" ".env"`) do set "API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MINIO_CONSOLE_PORT=" ".env"`) do set "MINIO_CONSOLE_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MAIL_PORT=" ".env"`) do set "MAIL_PORT=%%b"
)

echo Memory limits: API 640M, Postgres 160M, MinIO 128M, Mail 256M, UI 48M (~1.2 GB)
echo.

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
echo   App:        http://localhost:%UI_PORT%
echo   API proxy:  http://localhost:%UI_PORT%/api/v1/
echo   API direct: http://localhost:%API_PORT%
echo   PostgreSQL: localhost:%POSTGRES_PORT%
echo   MinIO:      http://localhost:%MINIO_CONSOLE_PORT%
echo   SMTP:       localhost:%MAIL_PORT%
echo.
echo   Logs:       docker compose logs -f
echo   Stop:       docker compose down
echo   Full RAM:   set COMPOSE_FILE=docker-compose.yml ^&^& docker compose up -d
echo.
