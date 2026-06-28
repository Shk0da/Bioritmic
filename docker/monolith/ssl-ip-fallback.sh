#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source /usr/local/bin/ssl-env.sh

ensure_ip_fallback_cert() {
  local ip
  ip="$(ssl_public_ip)"
  [[ -n "$ip" ]] || return 0
  ssl_has_ip_certificate && return 0

  local cert_dir
  cert_dir="$(ssl_cert_dir)"
  local domain
  domain="$(ssl_domain_name)"
  echo "Generating self-signed IP certificate for ${ip}..."
  openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
    -keyout "${cert_dir}/ip-privkey.pem" \
    -out "${cert_dir}/ip-fullchain.pem" \
    -subj "/CN=${ip}" \
    -addext "subjectAltName=IP:${ip},IP:127.0.0.1,DNS:${domain},DNS:localhost"
  chmod 600 "${cert_dir}/ip-privkey.pem"
  chmod 644 "${cert_dir}/ip-fullchain.pem"
}

ensure_ip_fallback_cert
