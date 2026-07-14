#!/usr/bin/env bash
# Backup do banco de dados PostgreSQL (Clínica IA)
# Uso: ./scripts/backup_db.sh [output_dir]
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="clinica_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

# Carrega .env se existir
if [ -f backend/.env ]; then
    set -a
    source backend/.env
    set +a
fi

echo "🔄 Iniciando backup do banco de dados..."

# Suporta DATABASE_URL ou variáveis individuais
if [ -n "${DATABASE_URL:-}" ]; then
    pg_dump "$DATABASE_URL" | gzip > "${OUTPUT_DIR}/${FILENAME}"
elif [ -n "${db_host:-}" ]; then
    PGPASSWORD="${db_password}" pg_dump \
        -h "${db_host}" \
        -p "${db_port:-5432}" \
        -U "${db_user}" \
        -d "${db_name}" \
        | gzip > "${OUTPUT_DIR}/${FILENAME}"
else
    echo "❌ DATABASE_URL ou variáveis de banco não configuradas."
    exit 1
fi

SIZE=$(du -h "${OUTPUT_DIR}/${FILENAME}" | cut -f1)
echo "✅ Backup concluído: ${OUTPUT_DIR}/${FILENAME} (${SIZE})"

# Limpa backups com mais de 30 dias
find "$OUTPUT_DIR" -name "clinica_backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
echo "🧹 Backups antigos (>30 dias) removidos."
