#!/bin/bash
set -euo pipefail

DOMAIN="${SSL_DOMAIN:-}"
CERT_DIR="${SSL_CERT_DIR:-/etc/nginx/certs}"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"

if [[ -z "${DOMAIN}" ]]; then
  exit 0
fi

LE_LIVE="/etc/letsencrypt/live/${DOMAIN}"
if [[ ! -s "${LE_LIVE}/fullchain.pem" || ! -s "${LE_LIVE}/privkey.pem" ]]; then
  echo "[certbot] Certificate not found in ${LE_LIVE}"
  exit 1
fi

mkdir -p "${CERT_DIR}"
cp -L "${LE_LIVE}/fullchain.pem" "${FULLCHAIN}"
cp -L "${LE_LIVE}/privkey.pem" "${PRIVKEY}"
chmod 644 "${FULLCHAIN}"
chmod 600 "${PRIVKEY}"

if nginx -t >/dev/null 2>&1; then
  nginx -s reload 2>/dev/null || true
fi

echo "[certbot] Certificates synced for ${DOMAIN}"
