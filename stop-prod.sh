#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
if [[ "${PROD_MAIL:-1}" == "1" ]]; then
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
fi

if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
  if [[ "${PROD_MAIL:-1}" == "1" ]]; then
    export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
  fi
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.lowmem.yml"
fi

echo "========================================"
echo "  Bioritmic - Stop Production (Docker)"
echo "========================================"
echo

if docker compose ps --status running -q 2>/dev/null | grep -q .; then
  docker compose down
  echo "  Production container stopped"
else
  if docker compose ps -a -q 2>/dev/null | grep -q .; then
    docker compose down
    echo "  Production stack removed (was not running)"
  else
    echo "  Production stack was not running"
  fi
fi

echo
echo "  Data volumes are kept (PostgreSQL, MinIO, Let's Encrypt)."
echo "  Remove volumes: docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v"
echo
echo "Done."
