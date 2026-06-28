#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source /usr/local/bin/ssl-env.sh

CERT_DIR="$(ssl_cert_dir)"
DOMAIN="$(ssl_domain_name)"
IP="$(ssl_public_ip)"
IP_CERT_NAME="$(ssl_ip_cert_name)"

mkdir -p "${CERT_DIR}"

sync_le_domain() {
  local le_live="/etc/letsencrypt/live/${DOMAIN}"
  if [[ -n "${SSL_DOMAIN:-}" && -s "${le_live}/fullchain.pem" ]]; then
    cp -L "${le_live}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
    cp -L "${le_live}/privkey.pem" "${CERT_DIR}/privkey.pem"
    chmod 644 "${CERT_DIR}/fullchain.pem"
    chmod 600 "${CERT_DIR}/privkey.pem"
    return 0
  fi
  return 1
}

sync_le_ip() {
  local le_live="/etc/letsencrypt/live/${IP_CERT_NAME}"
  if [[ -n "$IP" && -s "${le_live}/fullchain.pem" ]]; then
    cp -L "${le_live}/fullchain.pem" "${CERT_DIR}/ip-fullchain.pem"
    cp -L "${le_live}/privkey.pem" "${CERT_DIR}/ip-privkey.pem"
    chmod 644 "${CERT_DIR}/ip-fullchain.pem"
    chmod 600 "${CERT_DIR}/ip-privkey.pem"
    echo "[certbot] IP certificate synced for ${IP}"
    return 0
  fi
  return 1
}

if [[ -z "${SSL_DOMAIN:-}" ]]; then
  exit 0
fi

if ! sync_le_domain; then
  echo "[certbot] Domain certificate not found in /etc/letsencrypt/live/${DOMAIN}"
  exit 1
fi

echo "[certbot] Domain certificate synced for ${DOMAIN}"

sync_le_ip || /usr/local/bin/ssl-ip-fallback.sh || true

/usr/local/bin/configure-nginx.sh

if nginx -t >/dev/null 2>&1; then
  nginx -s reload 2>/dev/null || true
fi
