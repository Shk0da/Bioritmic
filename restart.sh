#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Bioritmic Restart ===${NC}"
echo ""

# --- Kill old processes ---
echo -e "${YELLOW}[1/5] Stopping old processes...${NC}"
pkill -f "bootRun\|bioritmic.*\.jar" 2>/dev/null && echo -e "  ${GREEN}Old backend stopped${NC}" || echo -e "  Backend was not running"
pkill -f "ng serve" 2>/dev/null && echo -e "  ${GREEN}Old frontend stopped${NC}" || echo -e "  Frontend was not running"
pkill -f "minio server" 2>/dev/null || true
sleep 1

# --- Docker ---
echo ""
echo -e "${YELLOW}[2/5] Restarting Docker containers...${NC}"
cd "$ROOT_DIR"
docker rm -f bioritmic-postgres >/dev/null 2>&1 || true
docker compose up -d postgres

echo -e "  Waiting for PostgreSQL..."
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

# --- Backend ---
echo ""
echo -e "${YELLOW}[3/5] Starting backend...${NC}"
cd "$ROOT_DIR"
./gradlew :api:bootRun > /tmp/bioritmic-api.log 2>&1 &
API_PID=$!
echo -e "  PID: $API_PID"

BACKEND_OK=false
echo -e "  Waiting for backend to start..."
for i in $(seq 1 60); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/management/actuator/health 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "  ${GREEN}Backend is ready (http://localhost:8080)${NC}"
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
echo -e "${YELLOW}[4/5] Starting frontend...${NC}"
cd "$ROOT_DIR/ui"
npm start > /tmp/bioritmic-ui.log 2>&1 &
UI_PID=$!
cd "$ROOT_DIR"
echo -e "  PID: $UI_PID"

FRONTEND_OK=false
echo -e "  Waiting for frontend to compile..."
for i in $(seq 1 120); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "  ${GREEN}Frontend is ready (http://localhost:4200)${NC}"
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
echo -e "  Frontend:   ${GREEN}http://localhost:4200${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:8080${NC}"
echo -e "  PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e ""
echo -e "  API logs:   ${YELLOW}tail -f /tmp/bioritmic-api.log${NC}"
echo -e "  UI logs:    ${YELLOW}tail -f /tmp/bioritmic-ui.log${NC}"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

wait
