#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml:docker-compose.mail.yml"
if [[ "${PROD_LOWMEM:-0}" == "1" ]]; then
  export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.lowmem.yml"
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MAIL_DOMAIN="${MAIL_DOMAIN:-bioritmic.ru}"
MAIL_HOSTNAME="mail.${MAIL_DOMAIN}"
SERVER_IP="${SSL_PUBLIC_IP:-}"
if [[ -z "$SERVER_IP" ]]; then
  SERVER_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
fi

echo "========================================"
echo "  Bioritmic — Mail server setup"
echo "========================================"
echo

if ! docker compose ps --status running mail 2>/dev/null | grep -q mail; then
  echo "Mail container is not running. Start production stack first:"
  echo "  ./start-prod.sh"
  exit 1
fi

echo "[1/3] Ensuring mailbox noreply@${MAIL_DOMAIN}..."
PASSWORD="${MAIL_PASSWORD:-changeme}"
docker compose exec -T mail setup email add "noreply@${MAIL_DOMAIN}" "$PASSWORD" 2>/dev/null \
  || docker compose exec -T mail setup email update "noreply@${MAIL_DOMAIN}" "$PASSWORD" 2>/dev/null \
  || true

echo "[2/3] Generating DKIM keys (if missing)..."
docker compose exec -T mail setup config dkim domain "${MAIL_DOMAIN}" 2>/dev/null || true

echo "[3/3] Reading DKIM public key..."
DKIM_SELECTOR=""
DKIM_VALUE=""
DKIM_FILE=""
for DKIM_FILE in \
  "docker-data/dms/config/opendkim/keys/${MAIL_DOMAIN}/mail.txt" \
  "/tmp/docker-mailserver/opendkim/keys/${MAIL_DOMAIN}/mail.txt"; do
  if [[ -f "$DKIM_FILE" ]]; then
    break
  fi
done

if docker compose exec -T mail test -f "/tmp/docker-mailserver/opendkim/keys/${MAIL_DOMAIN}/mail.txt" 2>/dev/null; then
  DKIM_RAW="$(docker compose exec -T mail cat "/tmp/docker-mailserver/opendkim/keys/${MAIL_DOMAIN}/mail.txt" 2>/dev/null || true)"
  DKIM_SELECTOR="$(echo "$DKIM_RAW" | sed -n 's/.*\([a-zA-Z0-9_-]*\)\._domainkey.*/\1/p' | head -1)"
  if [[ -z "$DKIM_SELECTOR" ]]; then
    DKIM_SELECTOR="mail"
  fi
  DKIM_VALUE="$(echo "$DKIM_RAW" | tr -d '\n' | sed 's/.*( //; s/ ).*//; s/"//g; s/[[:space:]]\+/ /g' | sed 's/ ; /;/g')"
fi

if [[ -z "$DKIM_VALUE" ]]; then
  echo
  echo "DKIM key not found in container. Run manually:"
  echo "  docker compose exec mail setup config dkim domain ${MAIL_DOMAIN}"
  echo "  docker compose exec mail setup config dkim print"
fi

echo
echo "========================================"
echo "  DNS records for ${MAIL_DOMAIN}"
echo "========================================"
echo
echo "Add these at your domain registrar (replace YOUR_SERVER_IP if needed):"
echo
echo "1) A — mail host"
echo "   ${MAIL_HOSTNAME}  →  ${SERVER_IP:-YOUR_SERVER_IP}"
echo
echo "2) MX — incoming mail (optional; needed for replies to noreply)"
echo "   @  MX  10  ${MAIL_HOSTNAME}."
echo
echo "3) SPF — authorize your server to send"
if [[ -n "$SERVER_IP" ]]; then
  echo "   @  TXT  \"v=spf1 mx a ip4:${SERVER_IP} ~all\""
else
  echo "   @  TXT  \"v=spf1 mx a ~all\""
fi
echo
echo "4) DMARC — policy + reports"
echo "   _dmarc  TXT  \"v=DMARC1; p=quarantine; rua=mailto:postmaster@${MAIL_DOMAIN}\""
echo
if [[ -n "$DKIM_VALUE" ]]; then
  echo "5) DKIM — sign outgoing mail"
  echo "   ${DKIM_SELECTOR}._domainkey  TXT  \"${DKIM_VALUE}\""
else
  echo "5) DKIM — after keys exist:"
  echo "   docker compose exec mail setup config dkim print"
  echo "   Add the printed TXT record as mail._domainkey.${MAIL_DOMAIN}"
fi
echo
echo "6) PTR (reverse DNS) — set at VPS/hosting provider"
echo "   ${SERVER_IP:-YOUR_SERVER_IP}  →  ${MAIL_HOSTNAME}"
echo "   Without PTR, Gmail/Yandex often mark mail as spam."
echo
echo "7) Let's Encrypt for SMTP TLS (recommended in production)"
echo "   Add mail.${MAIL_DOMAIN} to the certificate:"
echo "   SSL_EXTRA_DOMAINS=mail.${MAIL_DOMAIN} in .env, then:"
echo "   ./scripts/issue-letsencrypt.sh"
echo "   docker compose restart mail"
echo
echo "Test outbound delivery:"
echo "  docker compose exec mail swaks --to you@gmail.com --from noreply@${MAIL_DOMAIN} --server 127.0.0.1:587 --auth-user noreply@${MAIL_DOMAIN} --auth-password '\$MAIL_PASSWORD' --tls"
echo
echo "Check reputation: https://www.mail-tester.com/"
echo
