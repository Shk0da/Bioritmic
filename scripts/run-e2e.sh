#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export BASE_URL="${BASE_URL:-http://localhost:2399}"
export API_URL="${API_URL:-http://localhost:6045}"
export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
export RATE_LIMIT_ENABLED="${RATE_LIMIT_ENABLED:-false}"

echo "==> Starting infrastructure (postgres, minio, mail)"
docker compose -f docker-compose.multi.yml up -d postgres minio mail

echo "==> Waiting for PostgreSQL"
for i in $(seq 1 30); do
  if docker compose -f docker-compose.multi.yml exec -T postgres pg_isready -U postgres -d bioritmic >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Starting API (Docker)"
docker compose -f docker-compose.multi.yml up -d --build api

echo "==> Waiting for API health"
for i in $(seq 1 60); do
  code="$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:6046/management/actuator/health" 2>/dev/null || true)"
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 2
done

echo "==> Starting UI dev server"
cd ui
if ! curl -sf "http://localhost:2399" >/dev/null 2>&1; then
  node scripts/inject-build-version.mjs
  npx ng serve --port 2399 --proxy-config proxy.conf.json >/tmp/bioritmic-ui-e2e.log 2>&1 &
  UI_PID=$!
  for i in $(seq 1 60); do
    if curl -sf "http://localhost:2399" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  trap 'kill "$UI_PID" 2>/dev/null || true' EXIT
fi

echo "==> Running E2E tests"
npm run test:e2e -- "$@"
