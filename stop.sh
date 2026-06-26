#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping Bioritmic services..."

# Kill backend
pkill -f "gradlew :api:bootRun" 2>/dev/null && echo "  Backend stopped" || echo "  Backend was not running"

# Kill frontend
pkill -f "ng serve" 2>/dev/null && echo "  Frontend stopped" || echo "  Frontend was not running"

# Kill MinIO (only the one we started)
pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null && echo "  MinIO stopped" || echo "  MinIO was not running"

# Stop Docker containers
cd "$ROOT_DIR"
if docker compose ps --status running -q 2>/dev/null | head -1 | grep -q .; then
    docker compose down 2>/dev/null && echo "  Docker containers stopped" || echo "  Docker was not running"
else
    echo "  Docker containers were not running"
fi

echo "Done."
