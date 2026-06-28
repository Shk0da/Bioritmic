#!/bin/bash
# Shared TLS helpers for monolith scripts.

ssl_cert_dir() {
  echo "${SSL_CERT_DIR:-/etc/nginx/certs}"
}

ssl_domain_name() {
  echo "${SSL_DOMAIN:-bioritmic.ru}"
}

ssl_public_ip() {
  echo "${SSL_PUBLIC_IP:-}"
}

ssl_ip_cert_name() {
  echo "bioritmic-ip"
}

ssl_extra_domains_csv() {
  echo "${SSL_EXTRA_DOMAINS:-}"
}

ssl_build_san_ext() {
  local primary
  primary="$(ssl_domain_name)"
  local -a sans=()
  sans+=("DNS:${primary}")
  local extra
  for extra in $(ssl_extra_domains_csv | tr ',' ' '); do
    extra="${extra// /}"
    [[ -n "$extra" ]] && sans+=("DNS:${extra}")
  done
  sans+=("DNS:localhost" "DNS:*.localhost" "IP:127.0.0.1")
  local ip
  ip="$(ssl_public_ip)"
  [[ -n "$ip" ]] && sans+=("IP:${ip}")
  local joined=""
  local item
  for item in "${sans[@]}"; do
    if [[ -z "$joined" ]]; then
      joined="$item"
    else
      joined="${joined},${item}"
    fi
  done
  echo "$joined"
}

ssl_has_ip_certificate() {
  local cert_dir
  cert_dir="$(ssl_cert_dir)"
  [[ -s "${cert_dir}/ip-fullchain.pem" && -s "${cert_dir}/ip-privkey.pem" ]]
}

ssl_is_self_signed() {
  local cert_file="${1:-}"
  [[ -s "$cert_file" ]] || return 1
  local subject issuer
  subject="$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/^subject=//')"
  issuer="$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/^issuer=//')"
  [[ -n "$subject" && "$subject" == "$issuer" ]]
}

ssl_certbot_enabled() {
  [[ -n "${CERTBOT_EMAIL:-}" && -n "${SSL_DOMAIN:-}" ]]
}

ssl_needs_letsencrypt_domain_cert() {
  local domain="${SSL_DOMAIN:-}"
  local cert_dir
  cert_dir="$(ssl_cert_dir)"
  local le_live="/etc/letsencrypt/live/${domain}/fullchain.pem"
  local nginx_cert="${cert_dir}/fullchain.pem"

  [[ -n "$domain" ]] || return 1
  [[ -s "$le_live" ]] && ! ssl_is_self_signed "$le_live" && return 1
  [[ -s "$nginx_cert" ]] && ! ssl_is_self_signed "$nginx_cert" && return 1
  return 0
}
