#!/usr/bin/env bash
# Hermes Agent OS — backup script.
# Backs up the SQLite database, .env, and prisma schema.
# Usage: ./scripts/backup.sh [output_dir]

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
OUTPUT_DIR="${1:-${PROJECT_DIR}/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="hermes-backup-${TIMESTAMP}"
BACKUP_DIR="${OUTPUT_DIR}/${BACKUP_NAME}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Target: ${BACKUP_DIR}"

if [ -f "${PROJECT_DIR}/db/custom.db" ]; then
  cp "${PROJECT_DIR}/db/custom.db" "${BACKUP_DIR}/custom.db"
  [ -f "${PROJECT_DIR}/db/custom.db-journal" ] && cp "${PROJECT_DIR}/db/custom.db-journal" "${BACKUP_DIR}/custom.db-journal" || true
  [ -f "${PROJECT_DIR}/db/custom.db-wal" ] && cp "${PROJECT_DIR}/db/custom.db-wal" "${BACKUP_DIR}/custom.db-wal" || true
  echo "[backup] Database copied."
else
  echo "[backup] WARNING: db/custom.db not found"
fi

if [ -f "${PROJECT_DIR}/.env" ]; then
  sed -E 's/(KEY|SECRET|TOKEN|PASSWORD)=.+/\1=***REDACTED***/gi' "${PROJECT_DIR}/.env" > "${BACKUP_DIR}/env.sanitized"
fi

if [ -d "${PROJECT_DIR}/prisma" ]; then
  cp -r "${PROJECT_DIR}/prisma" "${BACKUP_DIR}/prisma"
fi

if [ -d "${PROJECT_DIR}/download" ]; then
  cp -r "${PROJECT_DIR}/download" "${BACKUP_DIR}/download" 2>/dev/null || true
fi

cat > "${BACKUP_DIR}/MANIFEST.txt" << EOF
Hermes Agent OS Backup
======================
Timestamp: ${TIMESTAMP}
Project dir: ${PROJECT_DIR}
Restoration:
  ./scripts/restore.sh ${BACKUP_DIR}
EOF

TARBALL="${OUTPUT_DIR}/${BACKUP_NAME}.tar.gz"
tar -czf "${TARBALL}" -C "${OUTPUT_DIR}" "${BACKUP_NAME}"
rm -rf "${BACKUP_DIR}"

echo "[backup] Created ${TARBALL}"
echo "[backup] Size: $(du -h "${TARBALL}" | cut -f1)"

ls -1t "${OUTPUT_DIR}"/hermes-backup-*.tar.gz 2>/dev/null | tail -n +31 | while read -r old; do
  echo "[backup] Pruning old backup: $(basename "${old}")"
  rm -f "${old}"
done

echo "[backup] Done."
