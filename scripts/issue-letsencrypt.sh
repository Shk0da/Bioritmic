#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"

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
  echo "  CERTBOT_EMAIL=admin@bioritmic.ru"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx bioritmic; then
  echo "Container bioritmic is not running. Start with ./start-prod.sh"
  exit 1
fi

echo "Requesting Let's Encrypt certificate for ${SSL_DOMAIN}..."
docker exec bioritmic /usr/local/bin/certbot-init.sh

echo
echo "Checking certificate issuer..."
docker exec bioritmic openssl x509 -in /etc/nginx/certs/fullchain.pem -noout -issuer -dates

if docker exec bioritmic openssl x509 -in /etc/nginx/certs/fullchain.pem -noout -issuer | grep -q "issuer=CN=${SSL_DOMAIN}"; then
  echo
  echo "WARNING: certificate is still self-signed."
  echo "Check: DNS -> server IP, port 80 open, certbot logs:"
  echo "  docker compose logs bioritmic | grep -i certbot"
  exit 1
fi

echo
echo "Done. Trusted certificate is active for https://${SSL_DOMAIN}/"
