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
export UI_HTTPS_PORT="${UI_HTTPS_PORT:-443}"

if [[ -z "${SSL_DOMAIN:-}" && "${APP_FRONTEND_URL:-}" =~ ^https?://([^/:]+) ]]; then
  export SSL_DOMAIN="${BASH_REMATCH[1]}"
  if [[ "${SSL_DOMAIN}" == "localhost" || "${SSL_DOMAIN}" == "127.0.0.1" ]]; then
    unset SSL_DOMAIN
  fi
fi

export APP_FRONTEND_URL="${APP_FRONTEND_URL:-https://localhost}"
export APP_BASE_URL="${APP_BASE_URL:-$APP_FRONTEND_URL}"

if [[ "$UI_PORT" == "80" ]] && [[ "$(id -u)" -ne 0 ]] && command -v docker >/dev/null 2>&1; then
  if ! docker info 2>/dev/null | grep -q "rootless"; then
    echo "Note: binding host port 80 may require sudo on Linux."
    echo "      Or run: sudo ./start-prod.sh"
    echo
  fi
fi

echo "  HTTP:            http://localhost:${UI_PORT}"
echo "  HTTPS:           https://localhost:${UI_HTTPS_PORT}"
echo "  Public URL:      ${APP_FRONTEND_URL}"
echo "  Stack:           single container (PostgreSQL, MinIO, Postfix, API, UI)"
echo "  Profile:         docker,production,monolith (Swagger off)"
if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  echo "  Memory:          lowmem overlay enabled"
fi
if [[ -n "${CERTBOT_EMAIL:-}" && -n "${SSL_DOMAIN:-}" ]]; then
  echo "  TLS:             Let's Encrypt (certbot) for ${SSL_DOMAIN}"
  if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
    echo "  Certbot:         staging mode"
  fi
else
  echo "  TLS:             self-signed (set CERTBOT_EMAIL + SSL_DOMAIN for Let's Encrypt)"
fi
echo

echo "[1/2] Building and starting production stack..."
docker compose up --build -d

echo
echo "[2/2] Waiting for services..."
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
echo "  Production stack is running!"
echo "========================================"
echo
echo "  App:     ${APP_FRONTEND_URL}"
echo "  HTTP:    http://localhost:${UI_PORT}"
echo "  HTTPS:   https://localhost:${UI_HTTPS_PORT}"
echo "  Health:  ${APP_FRONTEND_URL}/api/v1/ (via UI proxy)"
echo
echo "  Logs:    docker compose logs -f bioritmic"
echo "  Stop:    docker compose down"
echo
echo "  Custom domain + Let's Encrypt:"
echo "    CERTBOT_EMAIL=admin@bioritmic.ru SSL_DOMAIN=bioritmic.ru APP_FRONTEND_URL=https://bioritmic.ru ./start-prod.sh"
echo "  Low RAM (2 GB VPS):"
echo "    PROD_LOWMEM=1 ./start-prod.sh"
echo
