#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source /usr/local/bin/ssl-env.sh

if [[ -z "${CERTBOT_EMAIL:-}" || -z "${SSL_DOMAIN:-}" ]]; then
  echo "[certbot] Skipping Let's Encrypt (set CERTBOT_EMAIL and SSL_DOMAIN)"
  exit 0
fi

DOMAIN="${SSL_DOMAIN}"
IP="$(ssl_public_ip)"
IP_CERT_NAME="$(ssl_ip_cert_name)"
LE_LIVE="/etc/letsencrypt/live/${DOMAIN}"
LE_IP_LIVE="/etc/letsencrypt/live/${IP_CERT_NAME}"

DOMAIN_ARGS=(-d "${DOMAIN}")
local_extra=""
for local_extra in $(ssl_extra_domains_csv | tr ',' ' '); do
  local_extra="${local_extra// /}"
  if [[ -n "$local_extra" && "$local_extra" != "$DOMAIN" ]]; then
    DOMAIN_ARGS+=(-d "${local_extra}")
  fi
done

need_domain=false
need_ip=false

if ssl_certbot_enabled; then
  ssl_needs_letsencrypt_domain_cert && need_domain=true
else
  [[ ! -s "${LE_LIVE}/fullchain.pem" ]] && need_domain=true
fi
if [[ -n "$IP" && ! -s "${LE_IP_LIVE}/fullchain.pem" ]]; then
  need_ip=true
fi

if [[ "$need_domain" == false && "$need_ip" == false ]]; then
  echo "[certbot] Using existing certificates for ${DOMAIN}${IP:+, ${IP}}"
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

if [[ "$need_domain" == true ]]; then
  echo "[certbot] Requesting domain certificate for ${DOMAIN}..."
  certbot certonly --webroot -w /var/www/certbot \
    "${DOMAIN_ARGS[@]}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email \
    "${STAGING_ARGS[@]}"
fi

if [[ "$need_ip" == true ]]; then
  echo "[certbot] Requesting short-lived IP certificate for ${IP}..."
  certbot certonly --webroot -w /var/www/certbot \
    --preferred-profile shortlived \
    --ip-address "${IP}" \
    --cert-name "${IP_CERT_NAME}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email \
    "${STAGING_ARGS[@]}"
fi

/usr/local/bin/sync-letsencrypt-certs.sh
echo "[certbot] Certificates issued for ${DOMAIN}${IP:+, ${IP}}"
