#!/bin/bash
set -euo pipefail

CERT_DIR="${SSL_CERT_DIR:-/etc/nginx/certs}"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"
DOMAIN="${SSL_DOMAIN:-bioritmic.ru}"

mkdir -p "${CERT_DIR}"

if [[ -n "${SSL_DOMAIN}" && -s "/etc/letsencrypt/live/${SSL_DOMAIN}/fullchain.pem" ]]; then
  /usr/local/bin/sync-letsencrypt-certs.sh
  exit 0
fi

if [[ -s "${FULLCHAIN}" && -s "${PRIVKEY}" ]]; then
  echo "TLS certificates already present in ${CERT_DIR}"
  exit 0
fi

if [[ -s "${CERT_DIR}/cert.pem" && -s "${CERT_DIR}/key.pem" ]]; then
  cp "${CERT_DIR}/cert.pem" "${FULLCHAIN}"
  cp "${CERT_DIR}/key.pem" "${PRIVKEY}"
  echo "TLS certificates mapped from cert.pem/key.pem"
  exit 0
fi

echo "Generating self-signed TLS certificate for ${DOMAIN}..."
openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
  -keyout "${PRIVKEY}" \
  -out "${FULLCHAIN}" \
  -subj "/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

chmod 600 "${PRIVKEY}"
chmod 644 "${FULLCHAIN}"
echo "Self-signed TLS certificate created."
