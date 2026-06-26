#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill_by_port() {
    local port=$1 name=$2
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Killing $name on port $port (PID: $(echo "$pids" | tr '\n' ' '))"
        echo "$pids" | xargs kill -15 2>/dev/null || true
        sleep 2
        pids=$(lsof -ti :"$port" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "  Force killing $name on port $port"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    else
        echo "  $name was not running on port $port"
    fi
}

echo "Stopping Bioritmic services..."

# Kill by port — more reliable than pkill by name
kill_by_port 8080 "Backend (API)"
kill_by_port 4200 "Frontend (Angular)"
kill_by_port 9340 "MinIO API"
kill_by_port 9341 "MinIO Console"

# Also kill any remaining gradle daemons / java workers
pkill -f "GradleWorkerMain" 2>/dev/null && echo "  Gradle workers stopped" || true

# Stop Docker containers
cd "$ROOT_DIR"
if docker compose ps --status running -q 2>/dev/null | head -1 | grep -q .; then
    docker compose down 2>/dev/null && echo "  Docker containers stopped" || echo "  Docker was not running"
else
    echo "  Docker containers were not running"
fi

echo "Done."
