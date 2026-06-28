#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
if [[ "${PROD_MAIL:-1}" == "1" ]]; then
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.mail.yml"
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${CERTBOT_EMAIL:-}" || -z "${SSL_DOMAIN:-}" ]]; then
  echo "Set CERTBOT_EMAIL and SSL_DOMAIN in .env first."
  echo "Example:"
  echo "  SSL_DOMAIN=bioritmic.ru"
  echo "  SSL_PUBLIC_IP=158.160.194.159"
  echo "  CERTBOT_EMAIL=admin@bioritmic.ru"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx bioritmic; then
  echo "Container bioritmic is not running. Start with ./start-prod.sh"
  exit 1
fi

echo "Pre-flight checks for ${SSL_DOMAIN}..."
RESOLVED_IP="$(getent ahosts "${SSL_DOMAIN}" 2>/dev/null | awk '{print $1; exit}')"
if [[ -z "${RESOLVED_IP}" ]]; then
  echo "ERROR: ${SSL_DOMAIN} has no DNS A/AAAA record."
  exit 1
fi
echo "  DNS ${SSL_DOMAIN} -> ${RESOLVED_IP}"

if [[ -n "${SSL_PUBLIC_IP:-}" && "${RESOLVED_IP}" != "${SSL_PUBLIC_IP}" ]]; then
  echo "WARNING: DNS points to ${RESOLVED_IP}, but SSL_PUBLIC_IP=${SSL_PUBLIC_IP}"
fi

echo "  HTTP challenge path:"
if curl -sf -o /dev/null -w "    %{http_code}\n" "http://${SSL_DOMAIN}/.well-known/acme-challenge/health-check" | grep -q 404; then
  echo "    OK (nginx serves /.well-known/acme-challenge/)"
else
  echo "    WARNING: unexpected response — port 80 must reach this server"
fi

echo
echo "Requesting Let's Encrypt certificate for ${SSL_DOMAIN}..."
if ! docker exec bioritmic /usr/local/bin/certbot-init.sh; then
  echo
  echo "Certbot failed. Recent logs:"
  docker compose logs --tail=80 bioritmic 2>/dev/null | grep -iE 'certbot|letsencrypt|challenge' || docker compose logs --tail=40 bioritmic
  exit 1
fi

echo
echo "Checking certificate issuer..."
docker exec bioritmic openssl x509 -in /etc/nginx/certs/fullchain.pem -noout -issuer -subject -dates

ISSUER="$(docker exec bioritmic openssl x509 -in /etc/nginx/certs/fullchain.pem -noout -issuer 2>/dev/null || true)"
if echo "$ISSUER" | grep -qi "Let's Encrypt"; then
  echo "  Trusted issuer detected."
else
  echo
  echo "WARNING: certificate is still self-signed (${ISSUER})."
  echo "Check certbot logs:"
  echo "  docker compose logs bioritmic | grep -i certbot"
  exit 1
fi

echo
echo "Verifying live site..."
LIVE_ISSUER="$(echo | openssl s_client -connect "${SSL_DOMAIN}:443" -servername "${SSL_DOMAIN}" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null || true)"
echo "  ${LIVE_ISSUER:-could not reach ${SSL_DOMAIN}:443}"
if echo "$LIVE_ISSUER" | grep -q "Let's Encrypt"; then
  echo
  echo "Done. Trusted certificate is active for https://${SSL_DOMAIN}/"
else
  echo
  echo "Certificate updated in container, but live site may still cache the old one."
  echo "Wait a few seconds and hard-refresh the browser (Ctrl+Shift+R)."
fi
