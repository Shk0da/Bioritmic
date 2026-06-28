@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"
set COMPOSE_FILE=docker-compose.yml;docker-compose.prod.yml

set UI_PORT=80
set APP_FRONTEND_URL=http://localhost
set APP_BASE_URL=http://localhost

if "%PROD_LOWMEM%"=="1" (
    set COMPOSE_FILE=docker-compose.yml;docker-compose.prod.yml;docker-compose.lowmem.yml
)

echo ========================================
echo   Bioritmic - Production (Docker)
echo ========================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy /Y .env.example .env >nul
    )
)
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "APP_FRONTEND_URL=" ".env"`) do set "APP_FRONTEND_URL=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "APP_BASE_URL=" ".env"`) do set "APP_BASE_URL=%%b"
)

set UI_PORT=80
if "%APP_FRONTEND_URL%"=="" set "APP_FRONTEND_URL=http://localhost"
if "%APP_BASE_URL%"=="" set "APP_BASE_URL=%APP_FRONTEND_URL%"

echo   UI:              http://localhost:%UI_PORT%
echo   Public URL:      %APP_FRONTEND_URL%
echo   Profile:         docker,production,monolith (Swagger off)
if "%PROD_LOWMEM%"=="1" echo   Memory:          lowmem overlay enabled
echo.

echo [1/2] Building and starting production stack...
docker compose up --build -d
if errorlevel 1 (
    echo Failed to start stack. Check: docker compose logs
    exit /b 1
)

echo.
echo [2/2] Waiting for services...
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
echo   Production stack is running!
echo ========================================
echo.
echo   App:  %APP_FRONTEND_URL%
echo.
echo   Logs: docker compose logs -f
echo   Stop: docker compose down
echo.
echo   Custom domain: set APP_FRONTEND_URL=https://bioritmic.ru before running
echo   Low RAM:       set PROD_LOWMEM=1
echo.
