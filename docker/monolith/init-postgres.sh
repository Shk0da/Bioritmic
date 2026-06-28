#!/bin/bash
set -euo pipefail

PG_BIN="/usr/lib/postgresql/16/bin"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [[ -s "${PGDATA}/PG_VERSION" ]]; then
  chown -R postgres:postgres "${PGDATA}"
  chmod 700 "${PGDATA}"
  exit 0
fi

echo "Initializing PostgreSQL..."
install -d -o postgres -g postgres "${PGDATA}"
gosu postgres "${PG_BIN}/initdb" -D "${PGDATA}" --encoding=UTF8 --locale=C.UTF-8

{
  echo "listen_addresses = '127.0.0.1'"
  echo "port = 5432"
  echo "lc_messages = 'C.UTF-8'"
  echo "lc_monetary = 'C.UTF-8'"
  echo "lc_numeric = 'C.UTF-8'"
  echo "lc_time = 'C.UTF-8'"
} >> "${PGDATA}/postgresql.conf"

{
  echo "local all all trust"
  echo "host all all 127.0.0.1/32 trust"
} >> "${PGDATA}/pg_hba.conf"

gosu postgres "${PG_BIN}/pg_ctl" -D "${PGDATA}" -w start
gosu postgres "${PG_BIN}/createdb" bioritmic || true
gosu postgres "${PG_BIN}/psql" -v ON_ERROR_STOP=1 -c "ALTER USER postgres PASSWORD 'postgres';"
gosu postgres "${PG_BIN}/pg_ctl" -D "${PGDATA}" -m fast -w stop

echo "PostgreSQL initialized."
