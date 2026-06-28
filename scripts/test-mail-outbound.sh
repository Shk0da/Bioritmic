#!/usr/bin/env bash
set -euo pipefail

# Send a test email (e.g. to mail-tester.com) through the production mail stack.
#
# Usage:
#   ./scripts/test-mail-outbound.sh test-xxxxx@mail-tester.com
#
# Get the address from https://www.mail-tester.com/ (copy the inbox shown on the page).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TO="${1:-}"
if [[ -z "$TO" ]]; then
  echo "Usage: $0 <recipient@mail-tester.com>"
  echo
  echo "1. Open https://www.mail-tester.com/"
  echo "2. Copy the test address (test-xxxxx@mail-tester.com)"
  echo "3. Run: $0 test-xxxxx@mail-tester.com"
  echo "4. Click «Then check your score» on mail-tester"
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MAIL_DOMAIN="${MAIL_DOMAIN:-bioritmic.ru}"
FROM="noreply@${MAIL_DOMAIN}"
PASSWORD="${MAIL_PASSWORD:-changeme}"

if ! docker ps --format '{{.Names}}' | grep -qx bioritmic-mail; then
  echo "Container bioritmic-mail is not running. Start with ./start-prod.sh"
  exit 1
fi

echo "Sending test email:"
echo "  From: ${FROM}"
echo "  To:   ${TO}"
echo

if docker exec bioritmic-mail swaks \
  --to "${TO}" \
  --from "${FROM}" \
  --server 127.0.0.1:587 \
  --auth-user "${FROM}" \
  --auth-password "${PASSWORD}" \
  --tls \
  --header "Subject: Bioritmic mail delivery test" \
  --body "Test from bioritmic.ru at $(date -u +%Y-%m-%dT%H:%M:%SZ)"; then
  echo
  echo "SMTP accepted the message. Check ${TO} / mail-tester score in ~30s."
  echo "If mail-tester still says «не получили» — outbound port 25 may be blocked by your VPS provider."
else
  echo
  echo "SMTP send failed. Logs:"
  docker logs --tail=40 bioritmic-mail 2>&1 | tail -20
  exit 1
fi
