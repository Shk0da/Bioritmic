@echo off
setlocal

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
:wait_pg
timeout /t 1 /nobreak >nul
docker compose exec -T postgres pg_isready -U postgres -d bioritmic >nul 2>&1
if errorlevel 1 goto wait_pg
echo   PostgreSQL is ready (port 5432)

echo.
echo [2/5] Checking MinIO (S3 storage)...
curl -sf http://localhost:9341 >nul 2>&1
if not errorlevel 1 (
    echo   MinIO is already running (port 9341)
) else (
    echo   MinIO not found. Skipping (S3 features won't work^)
)

echo.
echo [3/5] Starting Backend (Kotlin/Spring Boot on :8080^)...
cd /d "%ROOT_DIR%"
set JAVA_HOME=C:\Program Files\OpenJDK\jdk-21
start "bioritmic-api" cmd /c ".\gradlew.bat :api:bootRun > %TEMP%\bioritmic-api.log 2>&1"
echo   Waiting for backend to start...
:wait_api
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8080/management/actuator/health 2>nul | findstr /r "^200$ ^401$ ^403$" >nul 2>&1
if errorlevel 1 goto wait_api
echo   Backend is ready (http://localhost:8080^)

echo.
echo [4/5] Starting Frontend (Angular on :4200^)...
cd /d "%UI_DIR%"
start "bioritmic-ui" cmd /c "npx ng serve --proxy-config proxy.conf.json --open > %TEMP%\bioritmic-ui.log 2>&1"
echo   Frontend starting...

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
