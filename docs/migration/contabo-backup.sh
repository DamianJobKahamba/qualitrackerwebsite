#!/usr/bin/env bash
# BACKUP helper for the Contabo server. Reads from the app; writes ONLY into a new folder under /root.
# Deletes and modifies nothing on the server.
#
#   sudo bash contabo-backup.sh /path/to/app [--pg DBNAME] [--mysql DBNAME] [--sqlite /path/file.db] [--mongo DBNAME]
#
# The archive WILL contain secrets (.env files). Treat it like a password: keep it private, never email it or
# paste it anywhere, upload it only to the private Cloud Storage bucket, then delete the server copy after the
# team has confirmed the restore test.
set -euo pipefail
APP="${1:?usage: contabo-backup.sh /path/to/app [--pg DB] [--mysql DB] [--sqlite FILE] [--mongo DB]}"; shift || true
[ -d "$APP" ] || { echo "not a directory: $APP" >&2; exit 1; }
STAMP="$(date -u +%Y%m%d-%H%M%S)"; OUT="${BACKUP_BASE:-/root}/migration-backup-$STAMP"
umask 077; mkdir -p "$OUT"; chmod 700 "$OUT"
NAME="$(basename "$APP")"

echo "1/4 app files -> $OUT/$NAME.tar.gz (node_modules excluded; it can be reinstalled)"
tar --exclude='node_modules' -czf "$OUT/$NAME.tar.gz" -C "$(dirname "$APP")" "$NAME"

if [ -d "$APP/.git" ]; then
  echo "    git history -> $OUT/$NAME.gitbundle"; git -C "$APP" bundle create "$OUT/$NAME.gitbundle" --all >/dev/null 2>&1 || true
fi

echo "2/4 nginx configuration (no TLS private keys: new certificates are issued on Google)"
tar -czf "$OUT/nginx-config.tar.gz" -C /etc nginx 2>/dev/null || echo "    (no /etc/nginx)"

echo "3/4 database"
DB_DONE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pg)     pg_dump --no-owner "$2" 2>/dev/null | gzip > "$OUT/db-postgres-$2.sql.gz" || sudo -u postgres pg_dump --no-owner "$2" | gzip > "$OUT/db-postgres-$2.sql.gz"; DB_DONE=1; shift 2;;
    --mysql)  mysqldump --single-transaction "$2" | gzip > "$OUT/db-mysql-$2.sql.gz"; DB_DONE=1; shift 2;;
    --sqlite) sqlite3 "$2" ".backup '$OUT/db-$(basename "$2")'" 2>/dev/null || cp -p "$2" "$OUT/db-$(basename "$2")"; DB_DONE=1; shift 2;;
    --mongo)  mongodump --db "$2" --archive="$OUT/db-mongo-$2.archive" --gzip; DB_DONE=1; shift 2;;
    *) echo "unknown option $1" >&2; exit 1;;
  esac
done
[ "$DB_DONE" = 1 ] || echo "    NO database option given: if the app stores data in a database, re-run with --pg/--mysql/--sqlite/--mongo"

echo "4/4 checksums"
if command -v sha256sum >/dev/null 2>&1; then SUM="sha256sum"; else SUM="shasum -a 256"; fi
( cd "$OUT" && $SUM * > SHA256SUMS && cat SHA256SUMS )
echo; echo "Backup written to $OUT  (contains secrets)."
echo "Upload from Cloud Shell or any machine that is logged in to Google Cloud as an Owner:"
echo "  scp -r root@5.189.158.117:$OUT ."
echo "  gcloud storage cp --recursive migration-backup-$STAMP gs://BUCKET/contabo/"
