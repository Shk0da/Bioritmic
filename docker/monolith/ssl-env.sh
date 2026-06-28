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
