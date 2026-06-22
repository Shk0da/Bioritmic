#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping Bioritmic services..."

# Kill backend
pkill -f "gradlew :api:bootRun" 2>/dev/null && echo "  Backend stopped" || echo "  Backend was not running"

# Kill frontend
pkill -f "ng serve" 2>/dev/null && echo "  Frontend stopped" || echo "  Frontend was not running"

# Kill MinIO (only the one we started)
pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null && echo "  MinIO stopped" || echo "  MinIO was not running"

# Stop PostgreSQL (Docker)
cd "$ROOT_DIR"
docker compose down 2>/dev/null && echo "  PostgreSQL stopped" || echo "  PostgreSQL was not running"

echo "Done."
