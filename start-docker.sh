#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "========================================"
echo "  Bioritmic - Docker (full stack)"
echo "========================================"
echo

if [[ ! -f .env && -f .env.example ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

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
echo "  Swagger:    http://localhost:4200/swagger-ui.html"
echo "  PostgreSQL: localhost:5432"
echo "  MinIO:      http://localhost:9341"
echo "  SMTP:       localhost:587"
echo
echo "  Logs:  docker compose logs -f"
echo "  Stop:  docker compose down"
echo
