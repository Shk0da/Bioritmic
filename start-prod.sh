#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
if [[ "${PROD_MAIL:-1}" == "1" ]]; then
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
fi
export APP_FRONTEND_URL="${APP_FRONTEND_URL:-http://localhost}"
export APP_BASE_URL="${APP_BASE_URL:-$APP_FRONTEND_URL}"

if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
  if [[ "${PROD_MAIL:-1}" == "1" ]]; then
    export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
  fi
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.lowmem.yml"
fi

echo "========================================"
echo "  Bioritmic - Production (Docker)"
echo "========================================"
echo

if [[ ! -f .env && -f .env.example ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export UI_PORT=80
export UI_HTTPS_PORT="${UI_HTTPS_PORT:-443}"

if [[ -z "${SSL_DOMAIN:-}" && "${APP_FRONTEND_URL:-}" =~ ^https?://([^/:]+) ]]; then
  export SSL_DOMAIN="${BASH_REMATCH[1]}"
  if [[ "${SSL_DOMAIN}" == "localhost" || "${SSL_DOMAIN}" == "127.0.0.1" ]]; then
    unset SSL_DOMAIN
  fi
fi

if [[ -z "${SSL_PUBLIC_IP:-}" && "${APP_FRONTEND_URL:-}" =~ ^https?://([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) ]]; then
  export SSL_PUBLIC_IP="${BASH_REMATCH[1]}"
fi

export APP_FRONTEND_URL="${APP_FRONTEND_URL:-https://localhost}"
if [[ "${APP_FRONTEND_URL}" =~ ^http:// ]]; then
  export APP_FRONTEND_URL="https://${APP_FRONTEND_URL#http://}"
fi
export APP_BASE_URL="${APP_BASE_URL:-$APP_FRONTEND_URL}"
if [[ "${APP_BASE_URL}" =~ ^http:// ]]; then
  export APP_BASE_URL="https://${APP_BASE_URL#http://}"
fi

if [[ -z "${APP_CORS_ALLOWED_ORIGINS:-}" ]]; then
  _cors_origins=()
  _add_cors_origin() {
    local value="${1:-}"
    [[ -z "$value" ]] && return
    local existing
    for existing in "${_cors_origins[@]}"; do
      [[ "$existing" == "$value" ]] && return
    done
    _cors_origins+=("$value")
  }
  _add_cors_origin "${APP_FRONTEND_URL}"
  _add_cors_origin "${APP_BASE_URL}"
  if [[ -n "${SSL_PUBLIC_IP:-}" ]]; then
    _add_cors_origin "https://${SSL_PUBLIC_IP}"
  fi
  if [[ -n "${SSL_DOMAIN:-}" ]]; then
    _add_cors_origin "https://${SSL_DOMAIN}"
  fi
  if [[ -n "${SSL_EXTRA_DOMAINS:-}" ]]; then
    IFS=',' read -ra _ssl_extra_domains <<< "${SSL_EXTRA_DOMAINS}"
    for _domain in "${_ssl_extra_domains[@]}"; do
      _domain="${_domain// /}"
      [[ -n "$_domain" ]] && _add_cors_origin "https://${_domain}"
    done
  fi
  if [[ ${#_cors_origins[@]} -gt 0 ]]; then
    APP_CORS_ALLOWED_ORIGINS="$(
      IFS=,
      echo "${_cors_origins[*]}"
    )"
    export APP_CORS_ALLOWED_ORIGINS
  fi
fi

if [[ "$UI_PORT" == "80" ]] && [[ "$(id -u)" -ne 0 ]] && command -v docker >/dev/null 2>&1; then
  if ! docker info 2>/dev/null | grep -q "rootless"; then
    echo "Note: binding host port 80 may require sudo on Linux."
    echo "      Or run: sudo ./start-prod.sh"
    echo
  fi
fi

echo "  HTTP:            http://localhost:${UI_PORT}"
echo "  HTTPS:           https://localhost:${UI_HTTPS_PORT}"
echo "  Public URL:      ${APP_FRONTEND_URL}"
if [[ -n "${APP_CORS_ALLOWED_ORIGINS:-}" ]]; then
  echo "  CORS origins:    ${APP_CORS_ALLOWED_ORIGINS}"
fi
echo "  Stack:           monolith + mail server (set PROD_MAIL=0 to skip mail)"
echo "  Profile:         docker,production,monolith (Swagger off)"
if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  echo "  Memory:          lowmem overlay enabled"
fi
if [[ -n "${CERTBOT_EMAIL:-}" && -n "${SSL_DOMAIN:-}" ]]; then
  echo "  TLS:             Let's Encrypt (certbot) for ${SSL_DOMAIN}"
  if [[ -n "${SSL_PUBLIC_IP:-}" ]]; then
    echo "  TLS IP:          Let's Encrypt short-lived for ${SSL_PUBLIC_IP}"
  fi
  if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
    echo "  Certbot:         staging mode"
  fi
else
  echo "  TLS:             self-signed (browsers will warn — set CERTBOT_EMAIL + SSL_DOMAIN)"
  echo "  Fix:             ./scripts/issue-letsencrypt.sh"
fi
echo

echo "[1/2] Building and starting production stack..."
docker compose up --build -d

echo
echo "[2/2] Waiting for services..."
READY=0
for i in $(seq 1 120); do
  hc="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' bioritmic 2>/dev/null || echo missing)"
  mail_hc="skipped"
  if [[ "${PROD_MAIL:-1}" == "1" ]]; then
    mail_hc="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' bioritmic-mail 2>/dev/null || echo missing)"
  fi
  if [[ "$hc" == "healthy" && ( "$mail_hc" == "healthy" || "$mail_hc" == "skipped" ) ]]; then
    READY=1
    break
  fi
  if curl -sf "http://127.0.0.1:${UI_PORT}/api/v1/config/client" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if [[ "$hc" == "unhealthy" ]]; then
    echo
    echo "Container became unhealthy. Logs:"
    docker compose logs --tail=50 bioritmic
    exit 1
  fi
  if (( i % 5 == 0 )); then
    echo "  ... still starting ($((i * 3))s, app=${hc}, mail=${mail_hc})"
  fi
  sleep 3
done

if [[ "$READY" -ne 1 ]]; then
  echo
  echo "Timed out waiting for the API. UI may respond before the backend is ready."
  echo "Check logs: docker compose logs -f bioritmic"
  docker compose logs --tail=50 bioritmic
  exit 1
fi

if [[ -n "${CERTBOT_EMAIL:-}" && -n "${SSL_DOMAIN:-}" ]]; then
  LIVE_ISSUER="$(echo | openssl s_client -connect "${SSL_DOMAIN}:443" -servername "${SSL_DOMAIN}" 2>/dev/null \
    | openssl x509 -noout -issuer 2>/dev/null || true)"
  if ! echo "$LIVE_ISSUER" | grep -qi "Let's Encrypt"; then
    echo
    echo "[3/3] Installing trusted TLS certificate (Let's Encrypt)..."
    if [[ -x "${ROOT}/scripts/issue-letsencrypt.sh" ]]; then
      "${ROOT}/scripts/issue-letsencrypt.sh" || echo "  Certbot failed — run ./scripts/issue-letsencrypt.sh manually"
    else
      docker exec bioritmic /usr/local/bin/certbot-init.sh \
        || echo "  Certbot failed — check: docker compose logs bioritmic | grep certbot"
    fi
  fi
fi

echo
docker compose ps
echo
echo "========================================"
echo "  Production stack is running!"
echo "========================================"
echo
echo "  App:     ${APP_FRONTEND_URL}"
echo "  HTTP:    http://localhost:${UI_PORT}"
echo "  HTTPS:   https://localhost:${UI_HTTPS_PORT}"
echo "  Health:  ${APP_FRONTEND_URL}/api/v1/ (via UI proxy)"
echo
echo "  Logs:    docker compose logs -f bioritmic"
echo "  Mail:    docker compose logs -f mail"
echo "  Stop:    ./stop-prod.sh"
echo
if [[ "${PROD_MAIL:-1}" == "1" ]]; then
  echo "  Mail DNS + DKIM:  ./scripts/setup-mail-prod.sh"
  echo "  Change password:  set MAIL_PASSWORD in .env before ./start-prod.sh"
fi
echo
echo "  Custom domain + Let's Encrypt:"
echo "    SSL_DOMAIN=bioritmic.ru SSL_PUBLIC_IP=158.160.194.159 CERTBOT_EMAIL=admin@bioritmic.ru APP_FRONTEND_URL=https://bioritmic.ru ./start-prod.sh"
echo "  Access by server IP (add to .env before start):"
echo "    APP_FRONTEND_URL=https://YOUR_IP APP_CORS_ALLOWED_ORIGINS=https://YOUR_IP,https://bioritmic.ru"
echo "  Low RAM (2 GB VPS):"
echo "    PROD_LOWMEM=1 ./start-prod.sh"
echo
