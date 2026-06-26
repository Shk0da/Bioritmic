#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASSWORD="${MAIL_PASSWORD:-changeme}"

cd "$ROOT"

echo "Starting mail server..."
docker compose up -d mail

echo "Waiting for SMTP on port 587..."
for i in $(seq 1 90); do
  if (echo >/dev/tcp/localhost/587) >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ "$i" -eq 90 ]]; then
    echo "Mail server did not become ready on port 587 within 180 seconds." >&2
    exit 1
  fi
done

echo "Ensuring mailbox noreply@bioritmic.ru exists..."
docker compose exec -T mail setup email add "noreply@bioritmic.ru" "$PASSWORD" 2>/dev/null \
  || docker compose exec -T mail setup email update "noreply@bioritmic.ru" "$PASSWORD" 2>/dev/null \
  || true

echo "Mail server ready (SMTP localhost:587)."
echo "DKIM: docker compose exec mail setup config dkim domain bioritmic.ru"
