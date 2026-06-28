#!/bin/bash
set -euo pipefail

if [[ -z "${CERTBOT_EMAIL:-}" || -z "${SSL_DOMAIN:-}" ]]; then
  exit 0
fi

STAGING_ARGS=()
if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
  STAGING_ARGS+=(--staging)
fi

certbot renew --quiet --webroot -w /var/www/certbot "${STAGING_ARGS[@]}" \
  --deploy-hook /usr/local/bin/sync-letsencrypt-certs.sh
