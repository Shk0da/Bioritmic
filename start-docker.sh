#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    docker compose down
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Bioritmic — Docker mode${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}[1/2] Building images...${NC}"
docker compose build --parallel

echo ""
echo -e "${YELLOW}[2/2] Starting all services...${NC}"
docker compose up -d

echo ""
echo -e "  Waiting for services to be healthy..."

# Wait for backend
for i in $(seq 1 60); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/management/actuator/health 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}Backend is ready${NC}"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo -e "  ${RED}Backend failed to start. Run: docker compose logs api${NC}"
        exit 1
    fi
    sleep 2
done

# Wait for frontend
for i in $(seq 1 30); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>/dev/null || true)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "  ${GREEN}Frontend is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "  ${RED}Frontend failed to start. Run: docker compose logs ui${NC}"
        exit 1
    fi
    sleep 2
done

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
echo -e "  Actuator:   ${GREEN}http://localhost:8081/management/actuator/health${NC}"
echo ""
echo -e "  Logs:       ${YELLOW}docker compose logs -f${NC}"
echo -e "  Stop:       ${YELLOW}docker compose down${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script alive so Ctrl+C triggers cleanup
while true; do sleep 1; done
