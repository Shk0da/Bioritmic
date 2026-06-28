#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source /usr/local/bin/ssl-env.sh

CERT_DIR="$(ssl_cert_dir)"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"
IP_FULLCHAIN="${CERT_DIR}/ip-fullchain.pem"
IP_PRIVKEY="${CERT_DIR}/ip-privkey.pem"
DOMAIN="$(ssl_domain_name)"
IP="$(ssl_public_ip)"
SAN_EXT="$(ssl_build_san_ext)"

mkdir -p "${CERT_DIR}"

if [[ -n "${SSL_DOMAIN:-}" && -s "/etc/letsencrypt/live/${SSL_DOMAIN}/fullchain.pem" ]]; then
  /usr/local/bin/sync-letsencrypt-certs.sh
  /usr/local/bin/ssl-ip-fallback.sh
  exit 0
fi

if [[ -s "${FULLCHAIN}" && -s "${PRIVKEY}" ]]; then
  if [[ -z "$IP" ]] || ssl_has_ip_certificate; then
    echo "TLS certificates already present in ${CERT_DIR}"
    exit 0
  fi
fi

if [[ -s "${CERT_DIR}/cert.pem" && -s "${CERT_DIR}/key.pem" ]]; then
  cp "${CERT_DIR}/cert.pem" "${FULLCHAIN}"
  cp "${CERT_DIR}/key.pem" "${PRIVKEY}"
  echo "TLS certificates mapped from cert.pem/key.pem"
  exit 0
fi

echo "Generating self-signed TLS certificate (SAN: ${SAN_EXT})..."
openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
  -keyout "${PRIVKEY}" \
  -out "${FULLCHAIN}" \
  -subj "/CN=${DOMAIN}" \
  -addext "subjectAltName=${SAN_EXT}"

chmod 600 "${PRIVKEY}"
chmod 644 "${FULLCHAIN}"

if [[ -n "$IP" ]]; then
  cp "${FULLCHAIN}" "${IP_FULLCHAIN}"
  cp "${PRIVKEY}" "${IP_PRIVKEY}"
  chmod 644 "${IP_FULLCHAIN}"
  chmod 600 "${IP_PRIVKEY}"
fi

echo "Self-signed TLS certificate created."
