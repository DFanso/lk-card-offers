#!/usr/bin/env bash
#
# Wait for Postgres, then create the database if missing, apply migrations,
# seed reference data, and finally exec the container CMD (typically
# `bun run start`). Idempotent — safe to re-run on every container start.
#
# Skips db bootstrapping when SKIP_DB_BOOTSTRAP=1 is set (useful for sidecar
# containers that share the image but shouldn't migrate).
set -euo pipefail

log() { printf '[entrypoint] %s\n' "$*"; }

require_env() {
  local name=$1
  if [ -z "${!name:-}" ]; then
    log "ERROR: required env var $name is not set"
    exit 1
  fi
}

require_env DATABASE_URL
require_env AUTH_SECRET

if [ "${SKIP_DB_BOOTSTRAP:-0}" = "1" ]; then
  log "SKIP_DB_BOOTSTRAP=1 — skipping create/migrate/seed"
  exec "$@"
fi

# Parse host + port from DATABASE_URL to gate readiness on a TCP connection.
# `bun -e` is already in the image, so we use it as the URL parser.
# `|| true` because `read` returns non-zero when its input has no trailing
# newline — that's fine, we still got the values, but `set -e` would otherwise
# kill the script before any log line fires.
read -r DB_HOST DB_PORT < <(bun -e '
  const u = new URL(process.env.DATABASE_URL);
  console.log(`${u.hostname} ${u.port || 5432}`);
') || true

log "waiting for postgres at ${DB_HOST}:${DB_PORT}…"
WAIT_TIMEOUT=${DB_WAIT_TIMEOUT:-60}
elapsed=0
until bun -e "
  const net = require('node:net');
  const s = net.connect({ host: '${DB_HOST}', port: ${DB_PORT} });
  s.on('connect', () => { s.end(); process.exit(0); });
  s.on('error',   () => process.exit(1));
" 2>/dev/null; do
  elapsed=$((elapsed + 1))
  if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
    log "timed out after ${WAIT_TIMEOUT}s waiting for postgres"
    exit 1
  fi
  sleep 1
done
log "postgres is reachable"

# Call the TS entry points with Bun directly instead of via the package
# scripts. The package scripts use `tsx`, but inside this Bun image tsx fails
# to resolve its own CJS shim. Bun runs TypeScript natively, so this is both
# simpler and faster than re-introducing tsx.
log "ensuring database exists…"
bun db/create-database.ts

log "applying migrations…"
bunx drizzle-kit migrate

if [ "${SKIP_SEED:-0}" = "1" ]; then
  log "SKIP_SEED=1 — skipping seed"
else
  log "seeding reference data + super admin…"
  bun db/seed.ts
fi

log "starting app: $*"
exec "$@"
