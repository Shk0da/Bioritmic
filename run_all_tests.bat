@echo off
setlocal

REM Script to run all tests in sequence: backend, frontend, E2E (manual)
set ROOT_DIR=%~dp0
set UI_DIR=%ROOT_DIR%ui

call :print_info Starting all tests...
call :print_info =============================================

call :run_backend_tests
if errorlevel 1 exit /b 1

call :run_frontend_tests
if errorlevel 1 exit /b 1

call :run_e2e_tests
if errorlevel 1 exit /b 1

call :print_info =============================================
call :print_info All tests completed successfully!
call :print_info Note: E2E tests were skipped due to setup requirements.
exit /b 0

:run_backend_tests
call :print_info Running backend tests...
cd /d "%ROOT_DIR%"
if not exist "%ROOT_DIR%gradlew.bat" (
    call :print_error Gradle wrapper not found: gradlew.bat
    exit /b 1
)

call "%ROOT_DIR%gradlew.bat" :api:test
if errorlevel 1 (
    call :print_error Backend tests failed
    exit /b 1
)
call :print_info Backend tests passed
exit /b 0

:run_frontend_tests
call :print_info Running frontend unit tests...
cd /d "%UI_DIR%"
where npm >nul 2>nul
if errorlevel 1 (
    call :print_error npm not found in PATH
    exit /b 1
)

call npm test -- --watch=false
if errorlevel 1 (
    call :print_error Frontend unit tests failed
    exit /b 1
)
call :print_info Frontend unit tests passed
exit /b 0

:run_e2e_tests
call :print_warning E2E tests are skipped in this script
call :print_warning Run manually when backend/frontend are running:
call :print_warning   1. %ROOT_DIR%gradlew.bat :api:bootRun
call :print_warning   2. cd ui ^&^& npm start
call :print_warning   3. cd ui ^&^& npm run test:e2e
exit /b 0

:print_info
echo [INFO] %*
exit /b 0

:print_warning
echo [WARNING] %*
exit /b 0

:print_error
echo [ERROR] %*
exit /b 0
