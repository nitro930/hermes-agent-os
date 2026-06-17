#!/usr/bin/env bash
# Hermes Agent OS — restore script.
# Usage: ./scripts/restore.sh <backup_dir_or_archive>

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
INPUT="${1:-}"

if [ -z "${INPUT}" ]; then
  echo "Usage: $0 <backup_dir_or_archive>"
  exit 1
fi

# If it's an archive, extract it first
if [ -f "${INPUT}" ] && [[ "${INPUT}" == *.tar.gz ]]; then
  EXTRACT_DIR=$(mktemp -d)
  tar -xzf "${INPUT}" -C "${EXTRACT_DIR}"
  BACKUP_DIR=$(ls -d "${EXTRACT_DIR}"/*/ | head -n1)
  echo "[restore] Extracted archive to ${BACKUP_DIR}"
elif [ -d "${INPUT}" ]; then
  BACKUP_DIR="${INPUT}"
else
  echo "Error: ${INPUT} is neither a tar.gz archive nor a directory"
  exit 1
fi

echo "[restore] Source: ${BACKUP_DIR}"
echo "[restore] Target: ${PROJECT_DIR}"
echo ""
read -p "This will OVERWRITE your current database and config. Continue? (yes/no) " confirm
if [ "${confirm}" != "yes" ]; then
  echo "[restore] Aborted."
  exit 0
fi

# Stop the running app if any
pkill -f "next" 2>/dev/null || true
sleep 1

# Restore database
if [ -f "${BACKUP_DIR}/custom.db" ]; then
  cp "${BACKUP_DIR}/custom.db" "${PROJECT_DIR}/db/custom.db"
  [ -f "${BACKUP_DIR}/custom.db-wal" ] && cp "${BACKUP_DIR}/custom.db-wal" "${PROJECT_DIR}/db/custom.db-wal" || rm -f "${PROJECT_DIR}/db/custom.db-wal"
  [ -f "${BACKUP_DIR}/custom.db-journal" ] && cp "${BACKUP_DIR}/custom.db-journal" "${PROJECT_DIR}/db/custom.db-journal" || rm -f "${PROJECT_DIR}/db/custom.db-journal"
  echo "[restore] Database restored."
fi

# Restore prisma schema + migrations
if [ -d "${BACKUP_DIR}/prisma" ]; then
  rm -rf "${PROJECT_DIR}/prisma"
  cp -r "${BACKUP_DIR}/prisma" "${PROJECT_DIR}/prisma"
  echo "[restore] Prisma schema + migrations restored."
fi

# Restore download artifacts
if [ -d "${BACKUP_DIR}/download" ]; then
  rm -rf "${PROJECT_DIR}/download"
  cp -r "${BACKUP_DIR}/download" "${PROJECT_DIR}/download"
  echo "[restore] Download artifacts restored."
fi

# Regenerate Prisma client
cd "${PROJECT_DIR}"
npx prisma generate

echo ""
echo "[restore] Complete. You can now restart the app:"
echo "  cd ${PROJECT_DIR} && bun run dev"
echo ""
echo "Note: .env is NOT restored automatically (secrets were sanitized)."
echo "Re-enter your environment variables manually."

# Cleanup temp extraction dir
if [ -n "${EXTRACT_DIR:-}" ]; then
  rm -rf "${EXTRACT_DIR}"
fi
