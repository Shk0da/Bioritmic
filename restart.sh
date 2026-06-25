#!/bin/bash
set -e

echo "=== Bioritmic Restart ==="
echo ""

# Kill old Java processes (backend) and orphan MinIO processes
echo "[0/4] Killing old processes..."
pkill -f "bootRun\|bioritmic.*\.jar" 2>/dev/null || true
pkill -f "minio server" 2>/dev/null || true
sleep 1

# Restart Docker containers
echo "[1/4] Restarting Docker containers..."
# Remove stale containers so docker compose up can reuse the names
docker rm -f bioritmic-postgres bioritmic-minio >/dev/null 2>&1 || true
docker compose up -d

echo "[2/4] Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U postgres -d bioritmic > /dev/null 2>&1; do
  sleep 1
done
echo "  PostgreSQL is ready."

echo "[3/4] Waiting for MinIO..."
until docker compose exec -T minio mc ready local > /dev/null 2>&1; do
  sleep 1
done
echo "  MinIO is ready."

echo "[4/4] Starting backend..."
./gradlew :api:bootRun > /tmp/bioritmic-backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo "[5/5] Starting frontend..."
cd ui && npm start > /tmp/bioritmic-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Done ==="
echo "  PostgreSQL:   localhost:5432"
echo "  MinIO API:    localhost:9340"
echo "  MinIO Console: localhost:9341"
echo "  Backend:      localhost:8080 (PID $BACKEND_PID)"
echo "  Frontend:     localhost:4200 (PID $FRONTEND_PID)"
echo ""
echo "Logs: tail -f /tmp/bioritmic-backend.log /tmp/bioritmic-frontend.log"
echo "Stop: kill $BACKEND_PID $FRONTEND_PID"
