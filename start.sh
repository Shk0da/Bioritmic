#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/api"
UI_DIR="$ROOT_DIR/ui"

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

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Bioritmic — Starting project${NC}"
echo -e "${CYAN}========================================${NC}"

# --- Infrastructure: PostgreSQL (Docker) ---
echo ""
echo -e "${YELLOW}[1/5] Starting PostgreSQL (Docker)...${NC}"
cd "$ROOT_DIR"
docker compose up -d postgres
echo "  Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U postgres -d bioritmic > /dev/null 2>&1; then
        echo -e "  ${GREEN}PostgreSQL is ready (port 5432)${NC}"
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
echo -e "${YELLOW}[2/5] Checking MinIO (S3 storage)...${NC}"
if curl -sf http://localhost:9341 > /dev/null 2>&1; then
    echo -e "  ${GREEN}MinIO is already running (port 9341)${NC}"
else
    if command -v minio &> /dev/null; then
        echo -e "  Starting MinIO..."
        MINIO_ROOT_USER=bioritmic MINIO_ROOT_PASSWORD=bioritmic \
            minio server /tmp/bioritmic-minio --address ":9340" --console-address ":9341" > /tmp/bioritmic-minio.log 2>&1 &
        MINIO_PID=$!
        sleep 2
        if kill -0 "$MINIO_PID" 2>/dev/null; then
            echo -e "  ${GREEN}MinIO started (API: 9340, Console: 9341)${NC}"
        else
            echo -e "  ${RED}MinIO failed to start. Check /tmp/bioritmic-minio.log${NC}"
        fi
    else
        echo -e "  ${RED}MinIO not found. Install: brew install minio/stable/minio${NC}"
        echo -e "  ${YELLOW}Continuing without MinIO (S3 features won't work)${NC}"
    fi
fi

# --- Backend ---
echo ""
echo -e "${YELLOW}[3/5] Starting Backend (Kotlin/Spring Boot on :8080)...${NC}"
cd "$ROOT_DIR"
./gradlew :api:bootRun > /tmp/bioritmic-api.log 2>&1 &
API_PID=$!
echo -e "  PID: $API_PID"

echo -e "  Waiting for backend to start..."
for i in $(seq 1 60); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/management/actuator/health 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "  ${GREEN}Backend is ready (http://localhost:8080)${NC}"
        break
    fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
        echo -e "  ${RED}Backend process died. Check /tmp/bioritmic-api.log${NC}"
        tail -20 /tmp/bioritmic-api.log
        exit 1
    fi
    sleep 2
done

# --- Frontend ---
echo ""
echo -e "${YELLOW}[4/5] Starting Frontend (Angular on :4200)...${NC}"
cd "$UI_DIR"
npx ng serve --proxy-config proxy.conf.json --open > /tmp/bioritmic-ui.log 2>&1 &
UI_PID=$!
echo -e "  PID: $UI_PID"

echo -e "  Waiting for frontend to compile..."
for i in $(seq 1 120); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "  ${GREEN}Frontend is ready (http://localhost:4200)${NC}"
        break
    fi
    sleep 2
done

# --- Summary ---
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  Frontend:   ${GREEN}http://localhost:4200${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:8080${NC}"
echo -e "  Swagger:    ${GREEN}http://localhost:8080/swagger-ui.html${NC}"
echo -e "  PostgreSQL: ${GREEN}localhost:5432${NC}  (postgres/postgres)"
echo -e "  MinIO:      ${GREEN}http://localhost:9341${NC}  (bioritmic/bioritmic)"
echo -e "  Actuator:   ${GREEN}http://localhost:8080/management/actuator/health${NC}"
echo ""
echo -e "  API logs:   ${YELLOW}tail -f /tmp/bioritmic-api.log${NC}"
echo -e "  UI logs:    ${YELLOW}tail -f /tmp/bioritmic-ui.log${NC}"
echo -e "  MinIO logs: ${YELLOW}tail -f /tmp/bioritmic-minio.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

wait
