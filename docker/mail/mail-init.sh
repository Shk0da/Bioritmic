#!/bin/bash
set +e

DOMAIN="${MAIL_DOMAIN:-bioritmic.ru}"
PASSWORD="${MAILBOX_PASSWORD:-changeme}"

setup email add "noreply@${DOMAIN}" "${PASSWORD}" 2>/dev/null \
  || setup email update "noreply@${DOMAIN}" "${PASSWORD}" 2>/dev/null \
  || true

setup config dkim domain "${DOMAIN}" 2>/dev/null || true

exit 0
