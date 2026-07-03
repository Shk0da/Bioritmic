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

echo "[1/3] Cleaning up orphan containers..."
docker rm -f bioritmic-redis >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true

echo "[2/3] Building and starting..."
docker compose up --build -d

echo
echo "[3/3] Waiting for health check..."
READY=0
for i in $(seq 1 120); do
  hc="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' bioritmic 2>/dev/null || echo missing)"
  if [[ "$hc" == "healthy" ]]; then
    READY=1
    break
  fi
  if curl -sf "http://127.0.0.1:${UI_PORT}/api/v1/config/client" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if [[ "$hc" == "unhealthy" ]]; then
    echo "Container became unhealthy. Logs:"
    docker compose logs --tail=50 bioritmic
    exit 1
  fi
  if (( i % 5 == 0 )); then
    echo "  ... still starting ($((i * 3))s, health=${hc})"
  fi
  sleep 3
done

if [[ "$READY" -ne 1 ]]; then
  echo
  echo "Timed out waiting for the API. UI may respond before the backend is ready."
  echo "Check logs: docker compose logs -f bioritmic"
  docker compose logs --tail=50 bioritmic
  exit 1
fi

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
