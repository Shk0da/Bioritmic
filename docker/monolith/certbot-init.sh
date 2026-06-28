#!/bin/bash
set -euo pipefail

if [[ -z "${CERTBOT_EMAIL:-}" || -z "${SSL_DOMAIN:-}" ]]; then
  echo "[certbot] Skipping Let's Encrypt (set CERTBOT_EMAIL and SSL_DOMAIN)"
  exit 0
fi

LE_LIVE="/etc/letsencrypt/live/${SSL_DOMAIN}"
if [[ -s "${LE_LIVE}/fullchain.pem" ]]; then
  echo "[certbot] Using existing certificate for ${SSL_DOMAIN}"
  /usr/local/bin/sync-letsencrypt-certs.sh
  exit 0
fi

echo "[certbot] Waiting for nginx on port 80..."
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null http://127.0.0.1/ 2>/dev/null; then
    break
  fi
  sleep 2
done

STAGING_ARGS=()
if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
  STAGING_ARGS+=(--staging)
  echo "[certbot] Using Let's Encrypt staging environment"
fi

echo "[certbot] Requesting certificate for ${SSL_DOMAIN}..."
certbot certonly --webroot -w /var/www/certbot \
  -d "${SSL_DOMAIN}" \
  --email "${CERTBOT_EMAIL}" \
  --agree-tos --non-interactive --no-eff-email \
  "${STAGING_ARGS[@]}"

/usr/local/bin/sync-letsencrypt-certs.sh
echo "[certbot] Initial certificate issued for ${SSL_DOMAIN}"
