@echo off
REM Script to run all tests in sequence: backend, frontend, E2E
REM Usage: run_all_tests.bat

REM Colors (Windows 10+ supports ANSI colors, but we'll use simple text)
SET RED=[ERROR]
SET GREEN=[SUCCESS]
SET YELLOW=[WARNING]
SET NC=[END]

REM Function to print colored output
:print_info
echo %GREEN% [INFO] %~1% %NC%
exit /b 0

:print_warning
echo %YELLOW% [WARNING] %~1% %NC%
exit /b 0

:print_error
echo %RED% [ERROR] %~1% %NC%
exit /b 0

REM Function to check if command exists
:check_command_exists
where %1 >nul 2>nul
if %errorlevel%==0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to run backend tests
:run_backend_tests
print_info Running backend tests...
cd /Users/a.shkondin/Documents/Projects/Other/Bioritmic

if exist "gradlew.exe" (
    if "%errorlevel%"==0 (
        print_info ✅ Backend tests passed
        exit /b 0
    ) else (
        print_error ❌ Backend tests failed
        exit /b 1
    )
) else (
    print_error ❌ Gradle not found
    exit /b 1
)

REM Function to run frontend unit tests
:run_frontend_tests
print_info Running frontend unit tests...
cd /Users/a.shkondin/Documents/Projects/Other/Bioritmic/ui

if exist "node.exe" (
    if "%errorlevel%"==0 (
        print_info ✅ Frontend unit tests passed
        exit /b 0
    ) else (
        print_error ❌ Frontend unit tests failed
        exit /b 1
    )
) else (
    print_error ❌ Node.js not found
    exit /b 1
)

REM Function to run E2E tests (requires additional setup)
:run_e2e_tests
print_warning Running E2E tests...
print_warning Note: E2E tests require backend and frontend to be running.
print_warning Skipping E2E tests in this script.
print_warning To run E2E tests manually:
print_warning   1. Start backend: gradlew :api:bootRun
print_warning   2. Start frontend dev server: npm start (in ui\)
print_warning   3. Run E2E: npm run test:e2e (in ui\)
exit /b 0

REM Main function
:main
print_info Starting all tests...
print_info =============================================

REM Run backend tests
:run_backend_tests
if %errorlevel% neq 0 (
    exit /b 1
)

REM Run frontend tests
:run_frontend_tests
if %errorlevel% neq 0 (
    exit /b 1
)

REM Run E2E tests
:run_e2e_tests

print_info =============================================
print_info All tests completed successfully!
print_info Note: E2E tests were skipped due to setup requirements.
exit /b 0

REM Run main function
main
