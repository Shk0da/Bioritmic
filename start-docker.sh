#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
export COMPOSE_FILE="docker-compose.yml:docker-compose.lowmem.yml"

echo "========================================"
echo "  Bioritmic - Docker (2 GB RAM profile)"
echo "========================================"
echo

if [[ ! -f .env && -f .env.example ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

echo "Memory limits: API 640M, Postgres 160M, MinIO 128M, Mail 256M, UI 48M (~1.2 GB)"
echo

echo "[1/2] Building and starting all services..."
docker compose up --build -d

echo
echo "[2/2] Waiting for services..."
for i in $(seq 1 120); do
  if ! docker compose ps --format '{{.Health}}' 2>/dev/null | grep -qE 'unhealthy|starting'; then
    break
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
echo "  App:        http://localhost:4200"
echo "  API proxy:  http://localhost:4200/api/v1/"
echo "  PostgreSQL: localhost:5432"
echo "  MinIO:      http://localhost:9341"
echo "  SMTP:       localhost:587"
echo
echo "  Logs:  docker compose logs -f"
echo "  Stop:  docker compose down"
echo "  Full RAM: COMPOSE_FILE=docker-compose.yml docker compose up -d"
echo
