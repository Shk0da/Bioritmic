#!/bin/bash
set -euo pipefail

if [[ -z "${CERTBOT_EMAIL:-}" || -z "${SSL_DOMAIN:-}" ]]; then
  echo "[certbot] Renewal disabled (set CERTBOT_EMAIL and SSL_DOMAIN)"
  exec sleep infinity
fi

INTERVAL="${CERTBOT_RENEW_INTERVAL_SECONDS:-43200}"
INITIAL_DELAY="${CERTBOT_RENEW_INITIAL_DELAY_SECONDS:-3600}"

echo "[certbot] Renewal enabled for ${SSL_DOMAIN}, interval ${INTERVAL}s"
sleep "${INITIAL_DELAY}"

while true; do
  echo "[certbot] Running certbot renew..."
  /usr/local/bin/certbot-renew-once.sh || true
  sleep "${INTERVAL}"
done
