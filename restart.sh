#!/bin/bash
set -e

echo "=== Bioritmic Restart ==="
echo ""

# Restart Docker containers
echo "[1/4] Restarting Docker containers..."
docker compose down
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

# Kill old Java processes (backend)
echo "[4/4] Restarting backend..."
pkill -f "bootRun\|bioritmic.*\.jar" 2>/dev/null || true
sleep 1

echo ""
echo "=== Done ==="
echo "  PostgreSQL:  localhost:5432"
echo "  MinIO API:   localhost:9340"
echo "  MinIO Console: localhost:9341"
echo ""
echo "To start backend:  ./gradlew :api:bootRun"
echo "To start frontend: cd ui && npm start"
