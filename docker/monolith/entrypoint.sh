#!/bin/bash
set -euo pipefail

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
install -d -o postgres -g postgres -m 700 "${PGDATA}"
chown -R postgres:postgres "${PGDATA}"
chmod 700 "${PGDATA}"

if [[ -s "${PGDATA}/PG_VERSION" ]]; then
  for key in lc_messages lc_monetary lc_numeric lc_time; do
    if grep -q "^${key} = 'en_US.utf8'" "${PGDATA}/postgresql.conf" 2>/dev/null; then
      sed -i "s/^${key} = 'en_US.utf8'/${key} = 'C.UTF-8'/" "${PGDATA}/postgresql.conf"
    fi
  done
fi

/usr/local/bin/init-postgres.sh
/usr/local/bin/generate-ssl-cert.sh
/usr/local/bin/configure-nginx.sh
/usr/local/bin/configure-supervisord.sh
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
