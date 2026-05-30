#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup_db.sh — Backup PostgreSQL com retenção LGPD
#
# LGPD: Dados de saúde devem ser protegidos (Art. 11).
# Backups são considerados tratamento de dados — proteja-os igualmente.
#
# Uso:
#   chmod +x scripts/backup_db.sh
#   ./scripts/backup_db.sh
#
# Cron (diário às 02:00):
#   0 2 * * * /media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/scripts/backup_db.sh >> /var/log/clinica_backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuração ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

# Carregar variáveis do .env se existir
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
    set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/clinica_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# ── Funções ───────────────────────────────────────────────────────────────────

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

error() {
    log "ERRO: $*" >&2
    exit 1
}

# ── Preparação ────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

log "═══════════════════════════════════════════"
log "Iniciando backup Clínica IA — $TIMESTAMP"
log "═══════════════════════════════════════════"

# ── Parsear DATABASE_URL ──────────────────────────────────────────────────────

if [[ -z "${DATABASE_URL:-}" ]]; then
    error "DATABASE_URL não configurada no .env"
fi

# Extrair componentes da URL: postgres://user:pass@host:port/dbname
DB_URL="$DATABASE_URL"
DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*@.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"

if [[ -z "$DB_HOST" ]] || [[ -z "$DB_NAME" ]]; then
    error "Não foi possível parsear DATABASE_URL. Verifique o formato: postgres://user:pass@host:port/dbname"
fi

log "Host: $DB_HOST | DB: $DB_NAME | Port: $DB_PORT | User: $DB_USER"

# ── Executar backup ───────────────────────────────────────────────────────────

log "Executando pg_dump..."

PGPASSWORD="$DB_PASS" pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-acl \
    --exclude-table=login_attempts \
    2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"

# Verificar se o backup foi criado e tem tamanho razoável
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Arquivo de backup não foi criado: $BACKUP_FILE"
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "✅ Backup criado: $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"

# ── Proteção do arquivo ───────────────────────────────────────────────────────
# LGPD: Backup contém dados pessoais sensíveis — restringir permissões
chmod 600 "$BACKUP_FILE"
log "🔒 Permissões restritas (600) aplicadas ao backup."

# ── Limpeza de backups antigos ────────────────────────────────────────────────

log "Limpando backups com mais de ${RETENTION_DAYS} dias..."
OLD_COUNT=$(find "$BACKUP_DIR" -name "clinica_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" | wc -l)

if [[ "$OLD_COUNT" -gt 0 ]]; then
    find "$BACKUP_DIR" -name "clinica_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
    log "✅ $OLD_COUNT backup(s) antigo(s) removido(s)."
else
    log "Nenhum backup antigo para remover."
fi

# ── Relatório final ───────────────────────────────────────────────────────────

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "clinica_backup_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" --exclude="*.log" 2>/dev/null | cut -f1 || echo "N/A")

log "───────────────────────────────────────────"
log "✅ Backup concluído com sucesso!"
log "   Arquivo : $(basename "$BACKUP_FILE")"
log "   Tamanho : $BACKUP_SIZE"
log "   Total   : $TOTAL_BACKUPS backup(s) armazenados ($TOTAL_SIZE)"
log "   Retenção: $RETENTION_DAYS dias"
log "───────────────────────────────────────────"

exit 0
