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

domain_in_args() {
  local name="$1"
  local i
  for ((i= 1; i < ${#DOMAIN_ARGS[@]}; i += 2)); do
    [[ "${DOMAIN_ARGS[$i]}" == "$name" ]] && return 0
  done
  return 1
}

add_domain_if_challengable() {
  local name="${1// /}"
  [[ -z "$name" ]] && return
  domain_in_args "$name" && return
  local resolved=""
  resolved="$(getent ahosts "$name" 2>/dev/null | awk '{print $1; exit}')"
  if [[ -z "$resolved" ]]; then
    echo "[certbot] Skipping ${name} (no DNS A/AAAA record)"
    return
  fi
  if [[ -n "$IP" && "$resolved" != "$IP" ]]; then
    echo "[certbot] Skipping ${name} (DNS ${resolved} != server IP ${IP})"
    return
  fi
  DOMAIN_ARGS+=(-d "${name}")
}

DOMAIN_ARGS=(-d "${DOMAIN}")
add_domain_if_challengable "mail.${DOMAIN}"
local_extra=""
for local_extra in $(ssl_extra_domains_csv | tr ',' ' '); do
  add_domain_if_challengable "${local_extra// /}"
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

sync_domain_cert() {
  if [[ -s "${LE_LIVE}/fullchain.pem" ]] && ! ssl_is_self_signed "${LE_LIVE}/fullchain.pem"; then
    /usr/local/bin/sync-letsencrypt-certs.sh
    return 0
  fi
  echo "[certbot] Domain certificate not ready in ${LE_LIVE}"
  return 1
}

if [[ "$need_domain" == false && "$need_ip" == false ]]; then
  echo "[certbot] Using existing certificates for ${DOMAIN}${IP:+, ${IP}}"
  sync_domain_cert
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
  sync_domain_cert
fi

if [[ "$need_ip" == true ]]; then
  echo "[certbot] Requesting short-lived IP certificate for ${IP} (optional)..."
  if certbot certonly --webroot -w /var/www/certbot \
    --preferred-profile shortlived \
    --ip-address "${IP}" \
    --cert-name "${IP_CERT_NAME}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email \
    "${STAGING_ARGS[@]}"; then
    echo "[certbot] IP certificate issued for ${IP}"
  else
    echo "[certbot] WARNING: IP certificate failed — https://${IP}/ may show a warning (domain HTTPS is unaffected)"
  fi
  /usr/local/bin/ssl-ip-fallback.sh || true
fi

CERT_DIR="$(ssl_cert_dir)"
if [[ -s "${CERT_DIR}/fullchain.pem" ]] && ! ssl_is_self_signed "${CERT_DIR}/fullchain.pem"; then
  echo "[certbot] Trusted domain certificate active for ${DOMAIN}"
else
  sync_domain_cert || true
fi

echo "[certbot] Done for ${DOMAIN}"
