#!/usr/bin/env bash
# Shared production env loading for start-prod.sh, issue-letsencrypt.sh, etc.

load_prod_env() {
  local root="${1:-.}"
  cd "$root"

  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi

  if [[ -z "${SSL_DOMAIN:-}" && "${APP_FRONTEND_URL:-}" =~ ^https?://([^/:]+) ]]; then
    SSL_DOMAIN="${BASH_REMATCH[1]}"
    if [[ "${SSL_DOMAIN}" == "localhost" || "${SSL_DOMAIN}" == "127.0.0.1" ]]; then
      unset SSL_DOMAIN
    fi
  fi

  if [[ -z "${SSL_PUBLIC_IP:-}" && "${APP_FRONTEND_URL:-}" =~ ^https?://([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) ]]; then
    SSL_PUBLIC_IP="${BASH_REMATCH[1]}"
  fi

  if [[ -z "${CERTBOT_EMAIL:-}" && -n "${SSL_DOMAIN:-}" ]]; then
    CERTBOT_EMAIL="admin@${SSL_DOMAIN}"
  fi

  export SSL_DOMAIN SSL_PUBLIC_IP CERTBOT_EMAIL APP_FRONTEND_URL APP_BASE_URL
  export SSL_EXTRA_DOMAINS CERTBOT_STAGING MAIL_DOMAIN PROD_MAIL PROD_LOWMEM
  export MAIL_HOST MAIL_PORT MAIL_USERNAME MAIL_PASSWORD MAIL_FROM MAIL_FROM_NAME
  export MAIL_SMTP_AUTH MAIL_STARTTLS_ENABLE MAIL_STARTTLS_REQUIRED MAIL_SSL_TRUST
}

# Use docker-mailserver only when MAIL_HOST is the in-stack service name.
configure_prod_compose_file() {
  local root="${1:-.}"
  load_prod_env "$root"

  if [[ -n "${MAIL_HOST:-}" && "${MAIL_HOST}" != "mail" ]]; then
    export PROD_MAIL=0
  fi

  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
  if [[ "${PROD_MAIL:-1}" == "1" ]]; then
    export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
  fi
  if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
    export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.lowmem.yml"
  fi
}

ensure_prod_env_file() {
  local root="${1:-.}"
  cd "$root"

  if [[ ! -f .env && -f .env.production.example ]]; then
    echo "Creating .env from .env.production.example..."
    cp .env.production.example .env
    load_prod_env "$root"
    return
  fi

  if [[ ! -f .env && -f .env.example ]]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    load_prod_env "$root"
    return
  fi

  load_prod_env "$root"

  local updated=false
  if [[ -n "${SSL_DOMAIN:-}" ]] && ! grep -q '^SSL_DOMAIN=' .env 2>/dev/null; then
    echo "SSL_DOMAIN=${SSL_DOMAIN}" >> .env
    updated=true
  fi
  if [[ -n "${CERTBOT_EMAIL:-}" ]] && ! grep -q '^CERTBOT_EMAIL=' .env 2>/dev/null; then
    echo "CERTBOT_EMAIL=${CERTBOT_EMAIL}" >> .env
    updated=true
  fi
  if [[ -n "${SSL_PUBLIC_IP:-}" ]] && ! grep -q '^SSL_PUBLIC_IP=' .env 2>/dev/null; then
    echo "SSL_PUBLIC_IP=${SSL_PUBLIC_IP}" >> .env
    updated=true
  fi
  if [[ "$updated" == true ]]; then
    echo "Updated .env with TLS settings."
    load_prod_env "$root"
  fi
}
