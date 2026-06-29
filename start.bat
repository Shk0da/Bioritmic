@echo off
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "API_DIR=%ROOT_DIR%api"
set "UI_DIR=%ROOT_DIR%ui"

set POSTGRES_PORT=5433
set MINIO_API_PORT=19000
set MINIO_CONSOLE_PORT=19001
set API_PORT=6045
set API_ACTUATOR_PORT=6046
set UI_PORT=2399
set MAIL_PORT=2587

if exist "%ROOT_DIR%.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "POSTGRES_PORT=" "%ROOT_DIR%.env"`) do set "POSTGRES_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MINIO_API_PORT=" "%ROOT_DIR%.env"`) do set "MINIO_API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MINIO_CONSOLE_PORT=" "%ROOT_DIR%.env"`) do set "MINIO_CONSOLE_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_PORT=" "%ROOT_DIR%.env"`) do set "API_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "API_ACTUATOR_PORT=" "%ROOT_DIR%.env"`) do set "API_ACTUATOR_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "UI_PORT=" "%ROOT_DIR%.env"`) do set "UI_PORT=%%b"
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (`findstr /B "MAIL_PORT=" "%ROOT_DIR%.env"`) do set "MAIL_PORT=%%b"
)

call :trim_var POSTGRES_PORT
call :trim_var MINIO_API_PORT
call :trim_var MINIO_CONSOLE_PORT
call :trim_var API_PORT
call :trim_var API_ACTUATOR_PORT
call :trim_var UI_PORT
call :trim_var MAIL_PORT

for %%V in (POSTGRES_PORT MINIO_API_PORT MINIO_CONSOLE_PORT API_PORT API_ACTUATOR_PORT UI_PORT MAIL_PORT) do (
    for /f %%A in ("!%%V!") do set "%%V=%%A"
)
for /f %%A in ('powershell -NoProfile -Command "('%POSTGRES_PORT%' -replace '[^0-9]','')"') do set "POSTGRES_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%MINIO_API_PORT%' -replace '[^0-9]','')"') do set "MINIO_API_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%MINIO_CONSOLE_PORT%' -replace '[^0-9]','')"') do set "MINIO_CONSOLE_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%API_PORT%' -replace '[^0-9]','')"') do set "API_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%API_ACTUATOR_PORT%' -replace '[^0-9]','')"') do set "API_ACTUATOR_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%UI_PORT%' -replace '[^0-9]','')"') do set "UI_PORT=%%A"
for /f %%A in ('powershell -NoProfile -Command "('%MAIL_PORT%' -replace '[^0-9]','')"') do set "MAIL_PORT=%%A"
if not defined POSTGRES_PORT set "POSTGRES_PORT=5433"
if not defined MINIO_API_PORT set "MINIO_API_PORT=19000"
if not defined MINIO_CONSOLE_PORT set "MINIO_CONSOLE_PORT=19001"
if not defined API_PORT set "API_PORT=6045"
if not defined API_ACTUATOR_PORT set "API_ACTUATOR_PORT=6046"
if not defined UI_PORT set "UI_PORT=2399"
if not defined MAIL_PORT set "MAIL_PORT=2587"

cd /d "%ROOT_DIR%"
if not defined COMPOSE_FILE set "COMPOSE_FILE=docker-compose.multi.yml"

echo ========================================
echo   Bioritmic - Starting project
echo ========================================

echo.
echo [1/7] Stopping old processes...
call :kill_processes
echo   Done

echo.
echo [2/7] Starting infrastructure (Docker)...
call :require_docker
if errorlevel 1 exit /b 1

docker rm -f bioritmic-api bioritmic-ui >nul 2>&1
docker rm -f bioritmic-postgres >nul 2>&1
docker rm -f bioritmic-mail >nul 2>&1
docker compose up -d postgres mail
if errorlevel 1 (
    echo   Failed to start infrastructure. Check: docker compose logs
    exit /b 1
)

echo   Waiting for PostgreSQL to be ready...
set PG_OK=0
for /l %%i in (1,1,30) do (
    docker compose exec -T postgres pg_isready -U postgres -d bioritmic >nul 2>&1
    if not errorlevel 1 (
        set PG_OK=1
        goto pg_ready
    )
    timeout /t 1 /nobreak >nul
)
:pg_ready
if "!PG_OK!"=="0" (
    echo   PostgreSQL failed to start
    exit /b 1
)
echo   PostgreSQL is ready (port %POSTGRES_PORT%)

echo   Initializing mail (noreply@bioritmic.ru)...
if not defined MAIL_PASSWORD set "MAIL_PASSWORD=changeme"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\init-mail.ps1" -Password "%MAIL_PASSWORD%"
if errorlevel 1 (
    echo   Mail init failed. Check: docker compose logs mail
    exit /b 1
)

echo.
echo [3/7] Checking MinIO (S3 storage)...
curl -sf "http://localhost:%MINIO_CONSOLE_PORT%" >nul 2>&1
if not errorlevel 1 (
    echo   MinIO is already running (console port %MINIO_CONSOLE_PORT%)
    goto minio_done
)

echo   Starting MinIO (Docker)...
docker compose up -d minio >nul 2>&1
set MINIO_OK=0
for /l %%i in (1,1,30) do (
    curl -sf "http://localhost:%MINIO_CONSOLE_PORT%" >nul 2>&1
    if not errorlevel 1 (
        set MINIO_OK=1
        echo   MinIO started (API: %MINIO_API_PORT%, Console: %MINIO_CONSOLE_PORT%)
        goto minio_done
    )
    timeout /t 1 /nobreak >nul
)
if "!MINIO_OK!"=="0" (
    echo   MinIO Docker start timed out
    echo   Continuing without MinIO (S3 features won't work)
)
:minio_done

echo.
echo [4/7] Clean building backend...
if not defined JAVA_HOME (
    if exist "C:\Program Files\OpenJDK\jdk-21\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\OpenJDK\jdk-21"
    ) else (
        echo   JAVA_HOME is not set and default JDK path was not found.
        echo   Set JAVA_HOME to your JDK 21 installation and retry.
        exit /b 1
    )
)
call gradlew.bat clean :api:build -x test -x detekt > "%TEMP%\bioritmic-build.log" 2>&1
if errorlevel 1 (
    echo   Backend build failed. Check %TEMP%\bioritmic-build.log
    exit /b 1
)
echo   Backend built successfully

echo.
echo [5/7] Starting Backend (Kotlin/Spring Boot on :%API_PORT%)...
netstat -ano | findstr ":%API_PORT% " | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo   Port %API_PORT% is busy - stopping conflicting Docker API container...
    docker rm -f bioritmic-api >nul 2>&1
    timeout /t 1 /nobreak >nul
)

start "bioritmic-api" /min cmd /c "cd /d ""%ROOT_DIR%"" && set SPRING_PROFILES_ACTIVE=develop,swagger && set POSTGRES_PORT=%POSTGRES_PORT% && set MINIO_API_PORT=%MINIO_API_PORT% && set MAIL_PORT=%MAIL_PORT% && set API_PORT=%API_PORT% && set API_ACTUATOR_PORT=%API_ACTUATOR_PORT% && call gradlew.bat :api:bootRun > ""%TEMP%\bioritmic-api.log"" 2>&1"

echo   Waiting for backend to start...
timeout /t 3 /nobreak >nul
set API_OK=0
for /l %%i in (1,1,60) do (
    if %%i gtr 3 (
        powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*bootRun*' }; if (-not $p) { exit 1 }" >nul 2>&1
        if errorlevel 1 (
            echo   Backend process died. Check %TEMP%\bioritmic-api.log
            powershell -NoProfile -Command "Get-Content -Path '%TEMP%\bioritmic-api.log' -Tail 20"
            exit /b 1
        )
    )
    set "HTTP_CODE="
    for /f %%H in ('curl -s -o nul -w "%%{http_code}" http://localhost:%API_ACTUATOR_PORT%/management/actuator/health 2^>nul') do set "HTTP_CODE=%%H"
    if "!HTTP_CODE!"=="200" set API_OK=1& goto api_ready
    if "!HTTP_CODE!"=="401" set API_OK=1& goto api_ready
    if "!HTTP_CODE!"=="403" set API_OK=1& goto api_ready
    timeout /t 2 /nobreak >nul
)
:api_ready
if "!API_OK!"=="0" (
    echo   Backend failed to start within 120 seconds. Check %TEMP%\bioritmic-api.log
    powershell -NoProfile -Command "Get-Content -Path '%TEMP%\bioritmic-api.log' -Tail 20"
    exit /b 1
)
echo   Backend is ready (http://localhost:%API_PORT%)

echo.
echo [6/7] Starting Frontend (Angular on :%UI_PORT%)...
cd /d "%UI_DIR%"
node scripts/inject-build-version.mjs
if errorlevel 1 (
    echo   Failed to inject build version
    exit /b 1
)
start "bioritmic-ui" /min cmd /c "cd /d ""%UI_DIR%"" && npx ng serve --port %UI_PORT% --proxy-config proxy.conf.json --open > ""%TEMP%\bioritmic-ui.log"" 2>&1"

echo   Waiting for frontend to compile...
timeout /t 3 /nobreak >nul
set UI_OK=0
for /l %%i in (1,1,120) do (
    if %%i gtr 3 (
        powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*ng serve*' }; if (-not $p) { exit 1 }" >nul 2>&1
        if errorlevel 1 (
            echo   Frontend process died. Check %TEMP%\bioritmic-ui.log
            powershell -NoProfile -Command "Get-Content -Path '%TEMP%\bioritmic-ui.log' -Tail 20"
            exit /b 1
        )
    )
    set "HTTP_CODE="
    for /f %%H in ('curl -s -o nul -w "%%{http_code}" http://localhost:%UI_PORT% 2^>nul') do set "HTTP_CODE=%%H"
    if "!HTTP_CODE!"=="200" set UI_OK=1& goto ui_ready
    if "!HTTP_CODE!"=="404" set UI_OK=1& goto ui_ready
    timeout /t 2 /nobreak >nul
)
:ui_ready
if "!UI_OK!"=="0" (
    echo   Frontend failed to start within 240 seconds. Check %TEMP%\bioritmic-ui.log
    powershell -NoProfile -Command "Get-Content -Path '%TEMP%\bioritmic-ui.log' -Tail 20"
    exit /b 1
)
echo   Frontend is ready (http://localhost:%UI_PORT%)

echo.
echo ========================================
echo   All services are running!
echo ========================================
echo.
echo   Frontend:   http://localhost:%UI_PORT%
echo   Backend:    http://localhost:%API_PORT%
echo   Swagger:    http://localhost:%API_PORT%/swagger-ui.html
echo   PostgreSQL: localhost:%POSTGRES_PORT%  (postgres/postgres)
echo   MinIO:      http://localhost:%MINIO_CONSOLE_PORT%  (bioritmic/bioritmic, API :%MINIO_API_PORT%)
echo   Mail SMTP:  localhost:%MAIL_PORT%
echo   Actuator:   http://localhost:%API_ACTUATOR_PORT%/management/actuator/health
echo.
echo   API logs:   type %TEMP%\bioritmic-api.log
echo   UI logs:    type %TEMP%\bioritmic-ui.log
echo   Build logs: type %TEMP%\bioritmic-build.log
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Shutting down...
call :kill_processes
echo All services stopped.
exit /b 0

:kill_processes
taskkill /F /FI "WINDOWTITLE eq bioritmic-api" >nul 2>&1 && echo   Backend stopped
taskkill /F /FI "WINDOWTITLE eq bioritmic-ui" >nul 2>&1 && echo   Frontend stopped
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*gradlew*bootRun*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*ng serve*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*gradlew*bootRun*' -or $_.CommandLine -like '*ng serve*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
goto :eof

:require_docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo   Docker CLI not found.
    echo   Install Docker Desktop: https://www.docker.com/products/docker-desktop/
    exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
    echo   Docker daemon is not running.
    echo   Start Docker Desktop and wait until it is ready, then run start.bat again.
    exit /b 1
)
goto :eof

:trim_var
setlocal EnableDelayedExpansion
set "value=!%~1!"
if not defined value (
    endlocal
    goto :eof
)
:trim_leading
if "!value:~0,1!"==" " (
    set "value=!value:~1!"
    goto trim_leading
)
:trim_trailing
if "!value:~-1!"==" " (
    set "value=!value:~0,-1!"
    goto trim_trailing
)
for /f "delims=" %%V in ("!value!") do (
    endlocal & set "%~1=%%V"
)
goto :eof
