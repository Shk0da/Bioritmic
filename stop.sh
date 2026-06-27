#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill_processes() {
    pkill -f "gradlew.*bootRun" 2>/dev/null && echo "  Backend stopped" || true
    pkill -f "ng serve" 2>/dev/null && echo "  Frontend stopped" || true
    pkill -f "GradleWorkerMain" 2>/dev/null || true
    pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null || true
    sleep 2
    pkill -9 -f "gradlew.*bootRun" 2>/dev/null || true
    pkill -9 -f "ng serve" 2>/dev/null || true
}

echo "Stopping Bioritmic services..."

kill_processes

# Stop Docker containers
cd "$ROOT_DIR"
if docker compose ps --status running -q 2>/dev/null | head -1 | grep -q .; then
    docker compose down 2>/dev/null && echo "  Docker containers stopped" || echo "  Docker was not running"
else
    echo "  Docker containers were not running"
fi

echo "Done."
