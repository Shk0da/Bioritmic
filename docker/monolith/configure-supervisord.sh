#!/bin/bash
set -euo pipefail

MAIL_HOST="${MAIL_HOST:-127.0.0.1}"

if [[ "$MAIL_HOST" != "127.0.0.1" && "$MAIL_HOST" != "localhost" ]]; then
  sed -i '/\[program:postfix\]/,/^$/ s/^autostart=true/autostart=false/' /etc/supervisor/supervisord.conf
  echo "[supervisor] External SMTP (${MAIL_HOST}) — internal Postfix disabled"
fi
