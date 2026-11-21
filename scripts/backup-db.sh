#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set." >&2
  exit 1
fi

BACKUP_DIR="storage/backups"
mkdir -p "${BACKUP_DIR}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${1:-${BACKUP_DIR}/backup-${TIMESTAMP}.sql}"

pg_dump --no-owner --no-privileges --clean --if-exists "${DATABASE_URL}" > "${OUT_FILE}"
echo "Database backup written to ${OUT_FILE}"
