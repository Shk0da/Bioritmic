#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
export APP_FRONTEND_URL="${APP_FRONTEND_URL:-http://localhost}"
export APP_BASE_URL="${APP_BASE_URL:-$APP_FRONTEND_URL}"

if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml:docker-compose.lowmem.yml"
fi

echo "========================================"
echo "  Bioritmic - Production (Docker)"
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

export UI_PORT=80
export APP_FRONTEND_URL="${APP_FRONTEND_URL:-http://localhost}"
export APP_BASE_URL="${APP_BASE_URL:-$APP_FRONTEND_URL}"

if [[ "$UI_PORT" == "80" ]] && [[ "$(id -u)" -ne 0 ]] && command -v docker >/dev/null 2>&1; then
  if ! docker info 2>/dev/null | grep -q "rootless"; then
    echo "Note: binding host port 80 may require sudo on Linux."
    echo "      Or run: sudo ./start-prod.sh"
    echo
  fi
fi

echo "  UI:              http://localhost:${UI_PORT}"
echo "  Public URL:      ${APP_FRONTEND_URL}"
echo "  API (internal):  ui nginx → api:6045"
echo "  Profile:         docker,production (Swagger off)"
if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  echo "  Memory:          lowmem overlay enabled"
fi
echo

echo "[1/2] Building and starting production stack..."
docker compose up --build -d

echo
echo "[2/2] Waiting for services..."
for _ in $(seq 1 120); do
  if ! docker compose ps --format '{{.Health}}' 2>/dev/null | grep -qE 'unhealthy|starting'; then
    break
  fi
  sleep 3
done

echo
docker compose ps
echo
echo "========================================"
echo "  Production stack is running!"
echo "========================================"
echo
echo "  App:     ${APP_FRONTEND_URL}"
echo "  Health:  ${APP_FRONTEND_URL}/api/v1/ (via UI proxy)"
echo
echo "  Logs:    docker compose logs -f"
echo "  Stop:    docker compose down"
echo
echo "  Custom domain:"
echo "    APP_FRONTEND_URL=https://bioritmic.ru ./start-prod.sh"
echo "  Low RAM (2 GB VPS):"
echo "    PROD_LOWMEM=1 ./start-prod.sh"
echo
