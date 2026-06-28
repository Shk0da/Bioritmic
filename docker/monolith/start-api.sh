#!/bin/bash
set -euo pipefail

for _ in $(seq 1 90); do
  if pg_isready -h 127.0.0.1 -U postgres -d bioritmic >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

for _ in $(seq 1 90); do
  if curl -sf http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

/usr/local/bin/minio-init.sh || true

exec java \
  --add-opens java.base/java.lang=ALL-UNNAMED \
  --add-opens java.base/java.net=ALL-UNNAMED \
  --add-opens java.base/java.io=ALL-UNNAMED \
  --add-opens java.base/java.util=ALL-UNNAMED \
  -jar /app/api/app.jar
