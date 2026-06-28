#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
export COMPOSE_FILE="docker-compose.yml:docker-compose.lowmem.yml"

echo "========================================"
echo "  Bioritmic - Docker (single container)"
echo "========================================"
echo

if [[ ! -f .env && -f .env.example ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
UI_PORT="${UI_PORT:-2399}"
UI_HTTPS_PORT="${UI_HTTPS_PORT:-2443}"

echo "Stack: PostgreSQL + MinIO + Postfix + API + UI in one container"
echo "Ports:  http://localhost:${UI_PORT}  https://localhost:${UI_HTTPS_PORT}"
echo "Memory: lowmem overlay (~1.5 GB limit)"
echo

echo "[1/2] Building and starting..."
docker compose up --build -d

echo
echo "[2/2] Waiting for health check..."
for _ in $(seq 1 120); do
  status="$(docker inspect -f '{{.State.Health.Status}}' bioritmic 2>/dev/null || echo starting)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$status" == "unhealthy" ]]; then
    echo "Container became unhealthy. Logs:"
    docker compose logs --tail=50 bioritmic
    exit 1
  fi
  sleep 3
done

echo
docker compose ps
echo
echo "========================================"
echo "  Stack is running!"
echo "========================================"
echo
echo "  App:   http://localhost:${UI_PORT}"
echo "  HTTPS: https://localhost:${UI_HTTPS_PORT}"
echo "  Logs:  docker compose logs -f bioritmic"
echo "  Stop:  docker compose down"
echo
echo "  Production on :80:  ./start-prod.sh"
echo "  Multi-container:    COMPOSE_FILE=docker-compose.multi.yml docker compose up -d"
echo
