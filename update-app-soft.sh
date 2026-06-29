#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.multi.yml}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_PORT="${API_PORT:-6045}"
API_ACTUATOR_PORT="${API_ACTUATOR_PORT:-6046}"
UI_PORT="${UI_PORT:-2399}"
CANARY_NAME="bioritmic-api-canary"
API_CONTAINER="bioritmic-api"
UI_CONTAINER="bioritmic-ui"

echo "========================================"
echo "  Bioritmic - Soft App Update"
echo "========================================"
echo "  Compose file: ${COMPOSE_FILE}"
echo "  Scope: api + ui only (db/s3 untouched)"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running."
  exit 1
fi

echo "[0/4] Verifying infra containers..."
if ! docker compose ps --status running postgres minio >/dev/null 2>&1; then
  echo "postgres/minio are not running in this compose project."
  echo "Start infra first (e.g. ./start.sh or docker compose up -d postgres minio)."
  exit 1
fi
echo "  postgres/minio running"
echo

echo "[1/4] Building new api/ui images..."
docker compose build api ui
echo

echo "[2/4] Canary API start (old API keeps running)..."
docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
docker compose run -d --no-deps --name "${CANARY_NAME}" api >/dev/null

canary_ready=0
for i in $(seq 1 120); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CANARY_NAME}" 2>/dev/null || echo missing)"
  run_state="$(docker inspect -f '{{.State.Status}}' "${CANARY_NAME}" 2>/dev/null || echo missing)"
  if [[ "${status}" == "healthy" ]]; then
    canary_ready=1
    break
  fi
  if [[ "${status}" == "unhealthy" || "${run_state}" == "exited" || "${run_state}" == "dead" || "${run_state}" == "missing" ]]; then
    echo "Canary API failed before becoming healthy."
    docker logs "${CANARY_NAME}" || true
    docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
    exit 1
  fi
  sleep 2
done

if [[ "${canary_ready}" -ne 1 ]]; then
  echo "Timed out waiting for canary API health."
  docker logs "${CANARY_NAME}" || true
  docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
  exit 1
fi

echo "  Canary is healthy. Switching main API..."
docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
docker compose up -d --no-deps api

echo "  Waiting for ${API_CONTAINER}..."
api_ready=0
for i in $(seq 1 120); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${API_CONTAINER}" 2>/dev/null || echo missing)"
  run_state="$(docker inspect -f '{{.State.Status}}' "${API_CONTAINER}" 2>/dev/null || echo missing)"
  if [[ "${status}" == "healthy" ]]; then
    api_ready=1
    break
  fi
  if [[ "${status}" == "unhealthy" || "${status}" == "missing" || "${run_state}" == "exited" || "${run_state}" == "dead" ]]; then
    echo "Main API became unhealthy during rollout."
    docker logs "${API_CONTAINER}" || true
    exit 1
  fi
  sleep 2
done

if [[ "${api_ready}" -ne 1 ]]; then
  echo "Timed out waiting for ${API_CONTAINER}."
  docker logs "${API_CONTAINER}" || true
  exit 1
fi
echo "  API rollout done"
echo

echo "[3/4] Updating UI container..."
docker compose up -d --no-deps ui

ui_ready=0
for i in $(seq 1 90); do
  ui_hc="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${UI_CONTAINER}" 2>/dev/null || echo missing)"
  ui_state="$(docker inspect -f '{{.State.Status}}' "${UI_CONTAINER}" 2>/dev/null || echo missing)"
  if [[ "${ui_hc}" == "healthy" || "${ui_hc}" == "none" ]]; then
    if curl -sf "http://127.0.0.1:${UI_PORT}/" >/dev/null 2>&1; then
      ui_ready=1
      break
    fi
  fi
  if [[ "${ui_hc}" == "unhealthy" || "${ui_hc}" == "missing" || "${ui_state}" == "exited" || "${ui_state}" == "dead" ]]; then
    echo "UI became unhealthy during rollout."
    docker logs "${UI_CONTAINER}" || true
    exit 1
  fi
  sleep 2
done

if [[ "${ui_ready}" -ne 1 ]]; then
  echo "Timed out waiting for UI."
  docker logs "${UI_CONTAINER}" || true
  exit 1
fi
echo "  UI rollout done"
echo

echo "[4/4] Verification"
if curl -sf "http://127.0.0.1:${API_ACTUATOR_PORT}/management/actuator/health" >/dev/null 2>&1; then
  echo "  API health: OK"
else
  echo "  API health endpoint check failed on port ${API_ACTUATOR_PORT}"
  exit 1
fi

echo
docker compose ps api ui postgres minio
echo
echo "Soft update completed successfully."
echo "DB/S3 were not recreated."
