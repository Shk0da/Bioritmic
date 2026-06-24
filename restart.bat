@echo off
echo === Bioritmic Restart ===
echo.

echo [1/4] Restarting Docker containers...
docker compose down
docker compose up -d

echo [2/4] Waiting for PostgreSQL...
:wait_pg
docker compose exec -T postgres pg_isready -U postgres -d bioritmic >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_pg
)
echo   PostgreSQL is ready.

echo [3/4] Waiting for MinIO...
:wait_minio
docker compose exec -T minio mc ready local >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_minio
)
echo   MinIO is ready.

echo [4/4] Stopping old backend processes...
taskkill /f /im java.exe >nul 2>&1

echo.
echo === Done ===
echo   PostgreSQL:    localhost:5432
echo   MinIO API:     localhost:9340
echo   MinIO Console: localhost:9341
echo.
echo To start backend:  gradlew :api:bootRun
echo To start frontend: cd ui ^&^& npm start
