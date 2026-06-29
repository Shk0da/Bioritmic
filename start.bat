@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
set API_DIR=%ROOT_DIR%api
set UI_DIR=%ROOT_DIR%ui
set API_PORT=6045
set API_ACTUATOR_PORT=6046
set UI_PORT=2399
set POSTGRES_PORT=5433
set MINIO_API_PORT=19000
set MINIO_CONSOLE_PORT=19001
set MAIL_PORT=2587
set "COMPOSE_FILE=%ROOT_DIR%docker-compose.multi.yml"
if exist "%ROOT_DIR%.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_PORT=" "%ROOT_DIR%.env"`) do set "API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_ACTUATOR_PORT=" "%ROOT_DIR%.env"`) do set "API_ACTUATOR_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "UI_PORT=" "%ROOT_DIR%.env"`) do set "UI_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "POSTGRES_PORT=" "%ROOT_DIR%.env"`) do set "POSTGRES_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MINIO_API_PORT=" "%ROOT_DIR%.env"`) do set "MINIO_API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MINIO_CONSOLE_PORT=" "%ROOT_DIR%.env"`) do set "MINIO_CONSOLE_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MAIL_PORT=" "%ROOT_DIR%.env"`) do set "MAIL_PORT=%%b"
)

echo ========================================
echo   Bioritmic - Starting project
echo ========================================

echo.
echo [1/6] Starting PostgreSQL (Docker)...
docker compose up -d postgres
echo   Waiting for PostgreSQL to be ready...
for /l %%i in (1,1,60) do (
    docker compose exec -T postgres pg_isready -U postgres -d bioritmic >nul 2>&1
    if not errorlevel 1 goto pg_ready
    timeout /t 1 /nobreak >nul
)
echo   PostgreSQL failed to start in 60 seconds
exit /b 1
:pg_ready
echo   PostgreSQL is ready (port %POSTGRES_PORT%)

echo.
echo [2/6] Starting MinIO (S3 storage)...
docker compose up -d minio >nul 2>&1
echo   Waiting for MinIO to be ready...
for /l %%i in (1,1,60) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%MINIO_CONSOLE_PORT%' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto minio_ready
    timeout /t 1 /nobreak >nul
)
echo   MinIO failed to start in 60 seconds
exit /b 1
:minio_ready
echo   MinIO is ready (console port %MINIO_CONSOLE_PORT%^)

echo.
echo [3/6] Starting Mail server (mail.bioritmic.ru^)...
cd /d "%ROOT_DIR%"
if exist "%ROOT_DIR%.env" (
    for /f "usebackq eol=# delims=" %%i in ("%ROOT_DIR%.env") do set "%%i"
)
if not defined MAIL_PASSWORD set MAIL_PASSWORD=changeme
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\init-mail.ps1" -Password "%MAIL_PASSWORD%"
if errorlevel 1 (
    echo   Mail server failed to start. Check: docker compose logs mail
    exit /b 1
)
echo   Mail server is ready (SMTP localhost:%MAIL_PORT%^)

echo.
echo [4/6] Starting Backend (Kotlin/Spring Boot on :%API_PORT%^)...
if not defined JAVA_HOME (
    if exist "C:\Program Files\OpenJDK\jdk-21\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\OpenJDK\jdk-21"
    ) else (
        echo   JAVA_HOME is not set and default JDK path was not found.
        echo   Set JAVA_HOME to your JDK 21 installation and retry.
        exit /b 1
    )
)
start "bioritmic-api" cmd /c "set POSTGRES_PORT=%POSTGRES_PORT% && set MINIO_API_PORT=%MINIO_API_PORT% && set MAIL_PORT=%MAIL_PORT% && set API_PORT=%API_PORT% && set API_ACTUATOR_PORT=%API_ACTUATOR_PORT% && .\gradlew.bat :api:bootRun -Dspring-boot.run.profiles=develop > %TEMP%\bioritmic-api.log 2>&1"
echo   Waiting for backend to start...
set API_OK=0
for /l %%i in (1,1,90) do (
    set "HTTP_CODE="
    for /f %%H in ('curl -s -o nul -w "%%{http_code}" http://localhost:%API_ACTUATOR_PORT%/management/actuator/health 2^>nul') do set "HTTP_CODE=%%H"
    if "!HTTP_CODE!"=="200" (
        set API_OK=1
        goto api_ready
    )
    if "!HTTP_CODE!"=="401" (
        set API_OK=1
        goto api_ready
    )
    if "!HTTP_CODE!"=="403" (
        set API_OK=1
        goto api_ready
    )
    timeout /t 2 /nobreak >nul
)
:api_ready
if "!API_OK!"=="0" (
    echo   Backend failed to start within 180 seconds. Check %TEMP%\bioritmic-api.log
    exit /b 1
)
echo   Backend is ready (http://localhost:%API_PORT%^)

echo.
echo [5/6] Starting Frontend (Angular on :%UI_PORT%^)...
cd /d "%UI_DIR%"
start "bioritmic-ui" cmd /c "npx ng serve --port %UI_PORT% --proxy-config proxy.conf.json --open > %TEMP%\bioritmic-ui.log 2>&1"
echo   Waiting for frontend to compile...
set UI_OK=0
for /l %%i in (1,1,120) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%UI_PORT%' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set UI_OK=1
        goto ui_ready
    )
    timeout /t 2 /nobreak >nul
)
:ui_ready
if "!UI_OK!"=="0" (
    echo   Frontend failed to start within 240 seconds. Check %TEMP%\bioritmic-ui.log
    type %TEMP%\bioritmic-ui.log | findstr /i "error ERR"
    exit /b 1
)
echo   Frontend is ready (http://localhost:%UI_PORT%^)

echo.
echo ========================================
echo   All services are running!
echo ========================================
echo.
echo   Frontend:   http://localhost:%UI_PORT%
echo   Backend:    http://localhost:%API_PORT%
echo   Swagger:    http://localhost:%API_PORT%/swagger-ui.html
echo   PostgreSQL: localhost:%POSTGRES_PORT%  (postgres/postgres^)
echo   MinIO:      http://localhost:%MINIO_CONSOLE_PORT%  (API :%MINIO_API_PORT%, bioritmic/bioritmic^)
echo   Mail:       localhost:%MAIL_PORT%  (noreply@bioritmic.ru^)
echo   Actuator:   http://localhost:%API_ACTUATOR_PORT%/management/actuator/health
echo.
echo   API logs:   type %TEMP%\bioritmic-api.log
echo   UI logs:    type %TEMP%\bioritmic-ui.log
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping services...
taskkill /FI "WINDOWTITLE eq bioritmic-api" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq bioritmic-ui" /F >nul 2>&1
cd /d "%ROOT_DIR%"
docker compose down
echo Done.
