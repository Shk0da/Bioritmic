#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

load_env_var() {
    local name="$1"
    local default="$2"
    local value="$default"
    if [ -f "$ROOT_DIR/.env" ]; then
        local line
        line=$(grep -E "^${name}=" "$ROOT_DIR/.env" | tail -1 || true)
        if [ -n "$line" ]; then
            value="${line#${name}=}"
            value="${value%$'\r'}"
        fi
    fi
    export "${name}=${value}"
}

load_env_var POSTGRES_PORT 5433
load_env_var MINIO_API_PORT 19000
load_env_var MINIO_CONSOLE_PORT 19001
load_env_var API_PORT 6045
load_env_var API_ACTUATOR_PORT 6046
load_env_var UI_PORT 2399
load_env_var MAIL_PORT 2587

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

kill_processes() {
    pkill -f "gradlew.*bootRun" 2>/dev/null && echo "  Backend stopped" || true
    pkill -f "ng serve" 2>/dev/null && echo "  Frontend stopped" || true
    pkill -f "GradleWorkerMain" 2>/dev/null || true
    pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null || true
    sleep 2
    pkill -9 -f "gradlew.*bootRun" 2>/dev/null || true
    pkill -9 -f "ng serve" 2>/dev/null || true
}

echo -e "${CYAN}=== Bioritmic Restart ===${NC}"
echo ""

# --- Kill old processes ---
echo -e "${YELLOW}[1/6] Killing old processes...${NC}"
kill_processes
echo -e "  ${GREEN}All old processes stopped${NC}"

# --- Docker fresh start ---
echo ""
echo -e "${YELLOW}[2/6] Restarting Docker containers...${NC}"
cd "$ROOT_DIR"
docker rm -f bioritmic-postgres >/dev/null 2>&1 || true
docker rm -f bioritmic-mail >/dev/null 2>&1 || true
docker compose up -d postgres mail

echo -e "  Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U postgres -d bioritmic > /dev/null 2>&1; then
        echo -e "  ${GREEN}PostgreSQL is ready (port ${POSTGRES_PORT})${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "  ${RED}PostgreSQL failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# --- MinIO ---
echo ""
echo -e "${YELLOW}[3/6] Starting MinIO...${NC}"
pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null || true
sleep 1
if command -v minio &> /dev/null; then
    MINIO_ROOT_USER=bioritmic MINIO_ROOT_PASSWORD=bioritmic \
        minio server /tmp/bioritmic-minio --address ":${MINIO_API_PORT}" --console-address ":${MINIO_CONSOLE_PORT}" > /tmp/bioritmic-minio.log 2>&1 &
    sleep 2
    echo -e "  ${GREEN}MinIO started${NC}"
else
    echo -e "  ${RED}MinIO not found, skipping${NC}"
fi

# --- Clean rebuild backend ---
echo ""
echo -e "${YELLOW}[4/6] Clean building backend...${NC}"
cd "$ROOT_DIR"
./gradlew clean :api:build -x test -x detekt > /tmp/bioritmic-build.log 2>&1
echo -e "  ${GREEN}Backend built successfully${NC}"

# --- Backend ---
echo ""
echo -e "${YELLOW}[5/6] Starting backend...${NC}"
cd "$ROOT_DIR"
SPRING_PROFILES_ACTIVE=develop,swagger ./gradlew :api:bootRun > /tmp/bioritmic-api.log 2>&1 &
API_PID=$!
echo -e "  PID: $API_PID"

BACKEND_OK=false
echo -e "  Waiting for backend to start..."
for i in $(seq 1 60); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_ACTUATOR_PORT}/management/actuator/health" 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "  ${GREEN}Backend is ready (http://localhost:${API_PORT})${NC}"
        BACKEND_OK=true
        break
    fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
        echo -e "  ${RED}Backend process died. Check /tmp/bioritmic-api.log${NC}"
        tail -20 /tmp/bioritmic-api.log
        exit 1
    fi
    sleep 2
done

if [ "$BACKEND_OK" = false ]; then
    echo -e "  ${RED}Backend failed to start within 120 seconds. Check /tmp/bioritmic-api.log${NC}"
    tail -20 /tmp/bioritmic-api.log
    exit 1
fi

# --- Frontend ---
echo ""
echo -e "${YELLOW}[6/6] Starting frontend...${NC}"
cd "$ROOT_DIR/ui"
npm start > /tmp/bioritmic-ui.log 2>&1 &
UI_PID=$!
cd "$ROOT_DIR"
echo -e "  PID: $UI_PID"

FRONTEND_OK=false
echo -e "  Waiting for frontend to compile..."
for i in $(seq 1 120); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${UI_PORT}" 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "  ${GREEN}Frontend is ready (http://localhost:${UI_PORT})${NC}"
        FRONTEND_OK=true
        break
    fi
    if ! kill -0 "$UI_PID" 2>/dev/null; then
        echo -e "  ${RED}Frontend process died. Check /tmp/bioritmic-ui.log${NC}"
        tail -20 /tmp/bioritmic-ui.log
        exit 1
    fi
    sleep 2
done

if [ "$FRONTEND_OK" = false ]; then
    echo -e "  ${RED}Frontend failed to start within 240 seconds. Check /tmp/bioritmic-ui.log${NC}"
    tail -20 /tmp/bioritmic-ui.log
    exit 1
fi

# --- Summary ---
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  Frontend:   ${GREEN}http://localhost:${UI_PORT}${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:${API_PORT}${NC}"
echo -e "  PostgreSQL: ${GREEN}localhost:${POSTGRES_PORT}${NC}"
echo ""
echo -e "  API logs:   ${YELLOW}tail -f /tmp/bioritmic-api.log${NC}"
echo -e "  UI logs:    ${YELLOW}tail -f /tmp/bioritmic-ui.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

wait
