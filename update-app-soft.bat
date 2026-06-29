@echo off
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

if not defined COMPOSE_FILE set "COMPOSE_FILE=docker-compose.multi.yml"

set API_PORT=6045
set API_ACTUATOR_PORT=6046
set UI_PORT=2399
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_PORT=" ".env"`) do set "API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_ACTUATOR_PORT=" ".env"`) do set "API_ACTUATOR_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "UI_PORT=" ".env"`) do set "UI_PORT=%%b"
)
for /f %%A in ('powershell -NoProfile -Command "('%API_PORT%' -replace '[^0-9]','')"') do set "API_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%API_ACTUATOR_PORT%' -replace '[^0-9]','')"') do set "API_ACTUATOR_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%UI_PORT%' -replace '[^0-9]','')"') do set "UI_PORT=%%A"
if not defined API_PORT set "API_PORT=6045"
if not defined API_ACTUATOR_PORT set "API_ACTUATOR_PORT=6046"
if not defined UI_PORT set "UI_PORT=2399"

set "CANARY_NAME=bioritmic-api-canary"
set "API_CONTAINER=bioritmic-api"
set "UI_CONTAINER=bioritmic-ui"

echo ========================================
echo   Bioritmic - Soft App Update
echo ========================================
echo   Compose file: %COMPOSE_FILE%
echo   Scope: api + ui only (db/s3 untouched)
echo.

docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker CLI not found.
    exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker daemon is not running.
    exit /b 1
)

echo [0/4] Verifying infra containers...
docker compose ps --status running postgres minio >nul 2>&1
if errorlevel 1 (
    echo postgres/minio are not running in this compose project.
    echo Start infra first ^(e.g. .\start.bat or docker compose up -d postgres minio^).
    exit /b 1
)
echo   postgres/minio running
echo.

echo [1/4] Building new api/ui images...
docker compose build api ui
if errorlevel 1 (
    echo Failed to build api/ui images.
    exit /b 1
)
echo.

echo [2/4] Canary API start ^(old API keeps running^)...
docker rm -f %CANARY_NAME% >nul 2>&1
docker compose run -d --no-deps --name %CANARY_NAME% api >nul
if errorlevel 1 (
    echo Failed to start canary api container.
    exit /b 1
)

set CANARY_READY=0
for /l %%i in (1,1,120) do (
    set "HC="
    set "RUN_STATE="
    for /f "delims=" %%s in ('docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" %CANARY_NAME% 2^>nul') do set "HC=%%s"
    for /f "delims=" %%s in ('docker inspect -f "{{.State.Status}}" %CANARY_NAME% 2^>nul') do set "RUN_STATE=%%s"
    if /i "!HC!"=="healthy" (
        set CANARY_READY=1
        goto canary_ok
    )
    if /i "!HC!"=="unhealthy" (
        echo Canary API became unhealthy.
        docker logs %CANARY_NAME%
        docker rm -f %CANARY_NAME% >nul 2>&1
        exit /b 1
    )
    if /i "!RUN_STATE!"=="exited" (
        echo Canary API exited before becoming healthy.
        docker logs %CANARY_NAME%
        docker rm -f %CANARY_NAME% >nul 2>&1
        exit /b 1
    )
    if /i "!RUN_STATE!"=="dead" (
        echo Canary API died before becoming healthy.
        docker logs %CANARY_NAME%
        docker rm -f %CANARY_NAME% >nul 2>&1
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
)
:canary_ok
if "!CANARY_READY!"=="0" (
    echo Timed out waiting for canary API health.
    docker logs %CANARY_NAME%
    docker rm -f %CANARY_NAME% >nul 2>&1
    exit /b 1
)

echo   Canary is healthy. Switching main API...
docker rm -f %CANARY_NAME% >nul 2>&1
docker compose up -d --no-deps api
if errorlevel 1 (
    echo Failed to switch main API container.
    exit /b 1
)

set API_READY=0
for /l %%i in (1,1,120) do (
    set "HC="
    set "RUN_STATE="
    for /f "delims=" %%s in ('docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" %API_CONTAINER% 2^>nul') do set "HC=%%s"
    for /f "delims=" %%s in ('docker inspect -f "{{.State.Status}}" %API_CONTAINER% 2^>nul') do set "RUN_STATE=%%s"
    if /i "!HC!"=="healthy" (
        set API_READY=1
        goto api_ok
    )
    if /i "!HC!"=="unhealthy" (
        echo Main API became unhealthy during rollout.
        docker logs %API_CONTAINER%
        exit /b 1
    )
    if /i "!RUN_STATE!"=="exited" (
        echo Main API exited during rollout.
        docker logs %API_CONTAINER%
        exit /b 1
    )
    if /i "!RUN_STATE!"=="dead" (
        echo Main API died during rollout.
        docker logs %API_CONTAINER%
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
)
:api_ok
if "!API_READY!"=="0" (
    echo Timed out waiting for main API health.
    docker logs %API_CONTAINER%
    exit /b 1
)
echo   API rollout done
echo.

echo [3/4] Updating UI container...
docker compose up -d --no-deps ui
if errorlevel 1 (
    echo Failed to update UI container.
    exit /b 1
)

set UI_READY=0
for /l %%i in (1,1,90) do (
    set "HC="
    for /f "delims=" %%s in ('docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" %UI_CONTAINER% 2^>nul') do set "HC=%%s"
    if /i "!HC!"=="unhealthy" (
        echo UI became unhealthy during rollout.
        docker logs %UI_CONTAINER%
        exit /b 1
    )
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%UI_PORT%/' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set UI_READY=1
        goto ui_ok
    )
    timeout /t 2 /nobreak >nul
)
:ui_ok
if "!UI_READY!"=="0" (
    echo Timed out waiting for UI readiness.
    docker logs %UI_CONTAINER%
    exit /b 1
)
echo   UI rollout done
echo.

echo [4/4] Verification
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%API_ACTUATOR_PORT%/management/actuator/health' -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo API health endpoint check failed on port %API_ACTUATOR_PORT%.
    exit /b 1
)
echo   API health: OK
echo.

docker compose ps api ui postgres minio
echo.
echo Soft update completed successfully.
echo DB/S3 were not recreated.
