#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source /usr/local/bin/ssl-env.sh

EXTRA="/etc/nginx/bioritmic-port80-extra.conf"
HTTPS_CONF="/etc/nginx/bioritmic-https.conf"
CERT_DIR="$(ssl_cert_dir)"
DOMAIN="${SSL_DOMAIN:-}"
IP="$(ssl_public_ip)"
EXTRA_DOMAINS="$(ssl_extra_domains_csv)"

if [[ "${REDIRECT_HTTP_TO_HTTPS:-false}" == "true" ]]; then
  cat > "${EXTRA}" <<'EOF'
location / {
    return 301 https://$host$request_uri;
}
EOF
  echo "[nginx] HTTP :80 redirects to HTTPS (except /.well-known/acme-challenge/)"
else
  cat > "${EXTRA}" <<'EOF'
include /etc/nginx/bioritmic-locations.conf;
EOF
  echo "[nginx] HTTP :80 serves the app (no redirect to HTTPS)"
fi

write_https_server() {
  local server_name="$1"
  local cert_file="$2"
  local key_file="$3"
  local default_mark="$4"
  cat >> "${HTTPS_CONF}" <<EOF
server {
    listen 443 ssl http2 ${default_mark};
    listen [::]:443 ssl http2 ${default_mark};
    server_name ${server_name};

    error_page 497 =307 https://\$https_redirect_host\$request_uri;

    ssl_certificate     ${cert_file};
    ssl_certificate_key ${key_file};
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 50m;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    include /etc/nginx/bioritmic-locations.conf;
}

EOF
}

: > "${HTTPS_CONF}"

DOMAIN_NAMES="_"
if [[ -n "$DOMAIN" ]]; then
  DOMAIN_NAMES="$DOMAIN"
  if [[ -n "$EXTRA_DOMAINS" ]]; then
    local_name=""
    for local_name in $(echo "$EXTRA_DOMAINS" | tr ',' ' '); do
      local_name="${local_name// /}"
      [[ -n "$local_name" ]] && DOMAIN_NAMES="${DOMAIN_NAMES} ${local_name}"
    done
  fi
fi

if [[ -n "$IP" ]] && ssl_has_ip_certificate; then
  write_https_server "${IP}" "${CERT_DIR}/ip-fullchain.pem" "${CERT_DIR}/ip-privkey.pem" ""
  echo "[nginx] HTTPS server for IP ${IP}"
fi

if [[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]]; then
  write_https_server "${DOMAIN_NAMES}" "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" "default_server"
  echo "[nginx] HTTPS server for ${DOMAIN_NAMES}"
else
  echo "[nginx] WARNING: no TLS certificate found for HTTPS"
fi
