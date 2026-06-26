@echo off
setlocal EnableDelayedExpansion

set ROOT_DIR=%~dp0
set API_DIR=%ROOT_DIR%api
set UI_DIR=%ROOT_DIR%ui

echo ========================================
echo   Bioritmic - Starting project
echo ========================================

echo.
echo [1/5] Starting PostgreSQL (Docker)...
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
echo   PostgreSQL is ready (port 5432)

echo.
echo [2/5] Starting MinIO (S3 storage)...
docker compose up -d minio >nul 2>&1
echo   Waiting for MinIO to be ready...
for /l %%i in (1,1,60) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:9341' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto minio_ready
    timeout /t 1 /nobreak >nul
)
echo   MinIO failed to start in 60 seconds
exit /b 1
:minio_ready
echo   MinIO is ready (port 9341^)

echo.
echo [3/5] Starting Backend (Kotlin/Spring Boot on :8080^)...
cd /d "%ROOT_DIR%"
if not defined JAVA_HOME (
    if exist "C:\Program Files\OpenJDK\jdk-21\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\OpenJDK\jdk-21"
    ) else (
        echo   JAVA_HOME is not set and default JDK path was not found.
        echo   Set JAVA_HOME to your JDK 21 installation and retry.
        exit /b 1
    )
)
start "bioritmic-api" cmd /c ".\gradlew.bat :api:bootRun -Dspring-boot.run.profiles=develop > %TEMP%\bioritmic-api.log 2>&1"
echo   Waiting for backend to start...
for /l %%i in (1,1,90) do (
    set "HTTP_CODE="
    for /f %%H in ('curl -s -o nul -w "%%{http_code}" http://localhost:8080/management/actuator/health 2^>nul') do set "HTTP_CODE=%%H"
    if "!HTTP_CODE!"=="200" goto api_ready
    if "!HTTP_CODE!"=="401" goto api_ready
    if "!HTTP_CODE!"=="403" goto api_ready
    timeout /t 2 /nobreak >nul
)
echo   Backend failed to start in expected time. Check %TEMP%\bioritmic-api.log
exit /b 1
:api_ready
echo   Backend is ready (http://localhost:8080^)

echo.
echo [4/5] Starting Frontend (Angular on :4200^)...
cd /d "%UI_DIR%"
start "bioritmic-ui" cmd /c "npx ng serve --proxy-config proxy.conf.json --open > %TEMP%\bioritmic-ui.log 2>&1"
echo   Waiting for frontend to start...
for /l %%i in (1,1,120) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:4200' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto ui_ready
    timeout /t 1 /nobreak >nul
)
echo   Frontend failed to start in expected time. Check %TEMP%\bioritmic-ui.log
exit /b 1
:ui_ready
echo   Frontend is ready (http://localhost:4200^)

echo.
echo ========================================
echo   All services are running!
echo ========================================
echo.
echo   Frontend:   http://localhost:4200
echo   Backend:    http://localhost:8080
echo   Swagger:    http://localhost:8080/swagger-ui.html
echo   PostgreSQL: localhost:5432  (postgres/postgres^)
echo   MinIO:      http://localhost:9341  (bioritmic/bioritmic^)
echo   Actuator:   http://localhost:8080/management/actuator/health
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
