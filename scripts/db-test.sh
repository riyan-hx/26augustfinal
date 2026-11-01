#!/usr/bin/env bash
# Runs migrations + pgTAP tests against a throwaway local Postgres.
# Usage: scripts/db-test.sh   (needs postgres 15+ binaries and pgTAP installed)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)}"
WORK="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap '"$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

"$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK" -l "$WORK/log" start >/dev/null
export PGHOST="$WORK" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres

psql -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/local-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -f "$f"
done
psql -v ON_ERROR_STOP=1 -q -c 'create extension if not exists pgtap with schema extensions'

status=0
for t in "$ROOT"/supabase/tests/database/*.test.sql; do
  echo "# $(basename "$t")"
  out="$(psql -X -q -t -A -v ON_ERROR_STOP=1 -c 'set search_path = public, extensions' -f "$t" 2>&1)" || status=1
  echo "$out" | grep -E '^(not ok|ok|#|1\.\.)|ERROR' || true
  echo "$out" | grep -qE '^not ok|ERROR|Looks like' && status=1
done
exit $status
