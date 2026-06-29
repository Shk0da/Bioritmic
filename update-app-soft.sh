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

wait_for_container_health() {
  local container="$1"
  local label="$2"
  local max_attempts="${3:-120}"
  local attempt=0
  local status run_state

  while (( attempt < max_attempts )); do
    attempt=$((attempt + 1))
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${container}" 2>/dev/null || echo missing)"
    run_state="$(docker inspect -f '{{.State.Status}}' "${container}" 2>/dev/null || echo missing)"

    if [[ "${status}" == "healthy" ]]; then
      return 0
    fi
    if [[ "${status}" == "unhealthy" || "${run_state}" == "exited" || "${run_state}" == "dead" || "${run_state}" == "missing" ]]; then
      echo "  ${label} failed (health=${status}, state=${run_state})."
      docker logs "${container}" 2>&1 | tail -40 || true
      return 1
    fi

    if (( attempt == 1 || attempt % 5 == 0 )); then
      echo "  ${label}: waiting for health... attempt ${attempt}/${max_attempts} (status=${status}, state=${run_state})"
    fi
    sleep 2
  done

  echo "  Timed out waiting for ${label}."
  docker logs "${container}" 2>&1 | tail -40 || true
  return 1
}

host_process_on_api_ports() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi
  for port in "${API_PORT}" "${API_ACTUATOR_PORT}"; do
    if lsof -iTCP:"${port}" -sTCP:LISTEN -n -P 2>/dev/null | grep -qiE 'java|Gradle'; then
      return 0
    fi
  done
  return 1
}

echo "[0/4] Verifying infra containers..."
if ! docker compose ps --status running postgres minio >/dev/null 2>&1; then
  echo "postgres/minio are not running in this compose project."
  echo "Start infra first (e.g. ./start.sh or docker compose up -d postgres minio)."
  exit 1
fi
echo "  postgres/minio running"

if ! docker compose ps --status running mail >/dev/null 2>&1; then
  echo "  mail is not running — starting mail..."
  docker compose up -d mail
fi
echo

if host_process_on_api_ports; then
  echo "Host process is listening on API ports ${API_PORT}/${API_ACTUATOR_PORT} (e.g. ./start.sh bootRun)."
  echo "Stop host API before Docker rollout:"
  echo "  pkill -f 'gradlew.*bootRun'  # or stop ./start.sh"
  exit 1
fi

echo "[1/4] Building new api/ui images..."
docker compose build api ui
echo

echo "[2/4] Canary API start (old API keeps running)..."
docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
# --use-aliases: canary must resolve postgres/minio/mail hostnames on the compose network
docker compose run -d --no-deps --use-aliases --name "${CANARY_NAME}" api

if ! wait_for_container_health "${CANARY_NAME}" "Canary API"; then
  docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
  exit 1
fi

echo "  Canary is healthy. Switching main API..."
docker rm -f "${CANARY_NAME}" >/dev/null 2>&1 || true
docker compose up -d --no-deps api

echo "  Waiting for ${API_CONTAINER}..."
if ! wait_for_container_health "${API_CONTAINER}" "Main API"; then
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
  if [[ "${i}" == "1" || $((i % 5)) -eq 0 ]]; then
    echo "  UI: waiting... attempt ${i}/90 (health=${ui_hc}, state=${ui_state})"
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
