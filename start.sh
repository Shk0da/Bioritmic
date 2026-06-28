#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/api"
UI_DIR="$ROOT_DIR/ui"

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

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null
    [ -n "$UI_PID" ] && kill "$UI_PID" 2>/dev/null
    wait 2>/dev/null
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

kill_processes() {
    pkill -f "gradlew.*bootRun" 2>/dev/null && echo "  Backend stopped" || true
    pkill -f "ng serve" 2>/dev/null && echo "  Frontend stopped" || true
    pkill -f "GradleWorkerMain" 2>/dev/null || true
    pkill -f "minio server /tmp/bioritmic-minio" 2>/dev/null || true
    sleep 2
    pkill -9 -f "gradlew.*bootRun" 2>/dev/null || true
    pkill -9 -f "ng serve" 2>/dev/null || true
}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Bioritmic — Starting project${NC}"
echo -e "${CYAN}========================================${NC}"

# --- Kill old processes ---
echo ""
echo -e "${YELLOW}[1/7] Stopping old processes...${NC}"
kill_processes
echo -e "  ${GREEN}Done${NC}"

# --- Infrastructure: PostgreSQL (Docker) ---
echo ""
echo -e "${YELLOW}[2/7] Starting infrastructure (Docker)...${NC}"
cd "$ROOT_DIR"
docker rm -f bioritmic-postgres >/dev/null 2>&1 || true
docker rm -f bioritmic-mail >/dev/null 2>&1 || true
docker compose up -d postgres mail
echo "  Waiting for PostgreSQL to be ready..."
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

# --- Infrastructure: MinIO ---
echo ""
echo -e "${YELLOW}[3/7] Checking MinIO (S3 storage)...${NC}"
if curl -sf "http://localhost:${MINIO_CONSOLE_PORT}" > /dev/null 2>&1; then
    echo -e "  ${GREEN}MinIO is already running (console port ${MINIO_CONSOLE_PORT})${NC}"
else
    if command -v minio &> /dev/null; then
        echo -e "  Starting MinIO..."
        MINIO_ROOT_USER=bioritmic MINIO_ROOT_PASSWORD=bioritmic \
            minio server /tmp/bioritmic-minio --address ":${MINIO_API_PORT}" --console-address ":${MINIO_CONSOLE_PORT}" > /tmp/bioritmic-minio.log 2>&1 &
        MINIO_PID=$!
        sleep 2
        if kill -0 "$MINIO_PID" 2>/dev/null; then
            echo -e "  ${GREEN}MinIO started (API: ${MINIO_API_PORT}, Console: ${MINIO_CONSOLE_PORT})${NC}"
        else
            echo -e "  ${RED}MinIO failed to start. Check /tmp/bioritmic-minio.log${NC}"
        fi
    else
        echo -e "  ${RED}MinIO not found. Install: brew install minio/stable/minio${NC}"
        echo -e "  ${YELLOW}Continuing without MinIO (S3 features won't work)${NC}"
    fi
fi

# --- Clean Build Backend ---
echo ""
echo -e "${YELLOW}[4/7] Clean building backend...${NC}"
cd "$ROOT_DIR"
./gradlew clean :api:build -x test -x detekt > /tmp/bioritmic-build.log 2>&1
echo -e "  ${GREEN}Backend built successfully${NC}"

# --- Backend ---
echo ""
echo -e "${YELLOW}[5/7] Starting Backend (Kotlin/Spring Boot on :${API_PORT})...${NC}"
cd "$ROOT_DIR"
SPRING_PROFILES_ACTIVE=develop,swagger ./gradlew :api:bootRun > /tmp/bioritmic-api.log 2>&1 &
API_PID=$!
echo -e "  PID: $API_PID"

echo -e "  Waiting for backend to start..."
BACKEND_OK=false
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
echo -e "${YELLOW}[6/7] Starting Frontend (Angular on :${UI_PORT})...${NC}"
cd "$UI_DIR"
npx ng serve --port "${UI_PORT}" --proxy-config proxy.conf.json --open > /tmp/bioritmic-ui.log 2>&1 &
UI_PID=$!
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
echo -e "  Swagger:    ${GREEN}http://localhost:${API_PORT}/swagger-ui.html${NC}"
echo -e "  PostgreSQL: ${GREEN}localhost:${POSTGRES_PORT}${NC}  (postgres/postgres)"
echo -e "  MinIO:      ${GREEN}http://localhost:${MINIO_CONSOLE_PORT}${NC}  (bioritmic/bioritmic, API :${MINIO_API_PORT})"
echo -e "  Mail SMTP:  ${GREEN}localhost:${MAIL_PORT}${NC}"
echo -e "  Actuator:   ${GREEN}http://localhost:${API_ACTUATOR_PORT}/management/actuator/health${NC}"
echo ""
echo -e "  API logs:   ${YELLOW}tail -f /tmp/bioritmic-api.log${NC}"
echo -e "  UI logs:    ${YELLOW}tail -f /tmp/bioritmic-ui.log${NC}"
echo -e "  MinIO logs: ${YELLOW}tail -f /tmp/bioritmic-minio.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

wait
