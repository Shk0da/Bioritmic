#!/bin/bash
set -euo pipefail

EXTRA="/etc/nginx/bioritmic-port80-extra.conf"

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
