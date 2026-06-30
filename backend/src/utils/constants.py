"""
Constantes globais do sistema mvpdepsicologia.

Centraliza todos os valores fixos do domínio de negócio:
modalidades, status, limites, nomes de tabelas, etc.
Evita magic strings espalhadas pelo código.
"""

# ─────────────────────────────────────────────────────────────
# Sistema
# ─────────────────────────────────────────────────────────────

APP_NAME: str = "mvpdepsicologia"
APP_VERSION: str = "2.0.0"
APP_TITLE: str = "Gestão Clínica Ocupacional"
APP_SUBTITLE: str = "Sistema de Gestão de Atendimentos"
APP_ICON: str = "🧠"

# ─────────────────────────────────────────────────────────────
# Domínio — Atendimentos
# ─────────────────────────────────────────────────────────────

MODALIDADES: list[str] = [
    "Psicologia Clínica",
    "Avaliação Psicológica",
    "Avaliação Neuropsicológica",
    "Terapia de Casal",
    "Terapia Familiar",
    "Psiquiatria",
    "Admissional",
    "Periódico",
    "Demissional",
    "Troca de Função",
    "Retorno ao Trabalho",
]

STATUS_ATENDIMENTO: list[str] = [
    "Agendado",
    "Em andamento",
    "Atendido",
    "Concluído",
    "Pendente",
    "Cancelado",
]

STATUS_CORES: dict[str, str] = {
    "Agendado":       "#3B82F6",  # azul
    "Em andamento":   "#F59E0B",  # amarelo
    "Atendido":       "#A855F7",  # roxo
    "Concluído":      "#10B981",  # verde
    "Pendente":       "#F97316",  # laranja
    "Cancelado":      "#EF4444",  # vermelho
}

STATUS_EMOJIS: dict[str, str] = {
    "Agendado":       "📅",
    "Em andamento":   "🔄",
    "Atendido":       "✅",
    "Concluído":      "🏁",
    "Pendente":       "⏳",
    "Cancelado":      "❌",
}

# ─────────────────────────────────────────────────────────────
# Banco de dados — Nomes de tabelas
# ─────────────────────────────────────────────────────────────

TABLE_ATENDIMENTOS: str = "atendimentos"
TABLE_NOTAS: str = "notas"
TABLE_ARQUIVOS: str = "arquivos"
TABLE_AUDITORIA: str = "auditoria"
TABLE_PREFERENCES: str = "user_preferences"
TABLE_DOCUMENTOS: str = "documentos"

# ─────────────────────────────────────────────────────────────
# Limites de sistema
# ─────────────────────────────────────────────────────────────

MAX_FILE_SIZE_MB: int = 50
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_FILE_TYPES: list[str] = ["pdf"]
ALLOWED_MIME_TYPES: list[str] = ["application/pdf"]

MAX_EMPRESA_LEN: int = 255
MAX_NOME_LEN: int = 255
MAX_MODALIDADE_LEN: int = 100
MAX_STATUS_LEN: int = 50
MAX_OBSERVACOES_LEN: int = 5000

# ─────────────────────────────────────────────────────────────
# Auditoria — Ações
# ─────────────────────────────────────────────────────────────

AUDIT_CREATE: str = "CREATE"
AUDIT_UPDATE: str = "UPDATE"
AUDIT_DELETE: str = "DELETE"
AUDIT_STATUS: str = "STATUS"
AUDIT_ATTACH: str = "ATTACH"
AUDIT_DETACH: str = "DETACH"
AUDIT_LOGIN: str = "LOGIN"
AUDIT_LOGOUT: str = "LOGOUT"

# ─────────────────────────────────────────────────────────────
# Session State Keys
# ─────────────────────────────────────────────────────────────

SESSION_AUTHENTICATED: str = "authenticated"
SESSION_USER_NAME: str = "user_name"
SESSION_CURRENT_PAGE: str = "current_page"
SESSION_THEME: str = "theme"

# ─────────────────────────────────────────────────────────────
# Navegação — Páginas
# ─────────────────────────────────────────────────────────────

PAGE_DASHBOARD: str = "dashboard"
PAGE_ATENDIMENTOS: str = "atendimentos"
PAGE_DOCUMENTOS: str = "documentos"
PAGE_AUTOMACOES: str = "automacoes"
PAGE_CONFIGURACOES: str = "configuracoes"

PAGES_CONFIG: dict[str, dict] = {
    PAGE_DASHBOARD:     {"icon": "📊", "label": "Dashboard",     "protected": True},
    PAGE_ATENDIMENTOS:  {"icon": "📋", "label": "Atendimentos",  "protected": True},
    PAGE_DOCUMENTOS:    {"icon": "📄", "label": "Documentos",    "protected": True},
    PAGE_AUTOMACOES:    {"icon": "⚡", "label": "Automações",    "protected": True},
    PAGE_CONFIGURACOES: {"icon": "⚙️", "label": "Configurações", "protected": True},
}

# ─────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────

LOG_FORMAT: str = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
LOG_FILE_MAX_BYTES: int = 5 * 1024 * 1024   # 5MB por arquivo de log
LOG_FILE_BACKUP_COUNT: int = 3               # mantém 3 backups rotacionados

# ─────────────────────────────────────────────────────────────
# Autenticação — Roles e Permissões
# ─────────────────────────────────────────────────────────────

# Roles disponíveis no sistema
ROLE_ADMIN: str = "admin"
ROLE_PSICOLOGO: str = "psicologo"
ROLE_RECEPCIONISTA: str = "recepcionista"

ALL_ROLES: list[str] = [ROLE_ADMIN, ROLE_PSICOLOGO, ROLE_RECEPCIONISTA]

ROLE_LABELS: dict[str, str] = {
    ROLE_ADMIN:         "Administrador",
    ROLE_PSICOLOGO:     "Psicólogo(a) / Profissional",
    ROLE_RECEPCIONISTA: "Recepcionista",
}

ROLE_ICONS: dict[str, str] = {
    ROLE_ADMIN:         "👑",
    ROLE_PSICOLOGO:     "🧠",
    ROLE_RECEPCIONISTA: "📋",
}

# Permissões por funcionalidade
PERM_VIEW_DASHBOARD: str = "view_dashboard"
PERM_VIEW_ATENDIMENTOS: str = "view_atendimentos"
PERM_CREATE_ATENDIMENTO: str = "create_atendimento"
PERM_EDIT_ATENDIMENTO: str = "edit_atendimento"
PERM_DELETE_ATENDIMENTO: str = "delete_atendimento"
PERM_VIEW_DOCUMENTOS: str = "view_documentos"
PERM_MANAGE_DOCUMENTOS: str = "manage_documentos"
PERM_VIEW_AUTOMACOES: str = "view_automacoes"
PERM_TRIGGER_AUTOMACOES: str = "trigger_automacoes"
PERM_VIEW_CONFIGURACOES: str = "view_configuracoes"
PERM_MANAGE_CONFIGURACOES: str = "manage_configuracoes"
PERM_VIEW_LOGS: str = "view_logs"
PERM_MANAGE_USERS: str = "manage_users"

# Mapa de permissões por role
ROLE_PERMISSIONS: dict[str, list[str]] = {
    ROLE_ADMIN: [
        PERM_VIEW_DASHBOARD, PERM_VIEW_ATENDIMENTOS,
        PERM_CREATE_ATENDIMENTO, PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO,
        PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS,
        PERM_VIEW_AUTOMACOES, PERM_TRIGGER_AUTOMACOES,
        PERM_VIEW_CONFIGURACOES, PERM_MANAGE_CONFIGURACOES,
        PERM_VIEW_LOGS, PERM_MANAGE_USERS,
    ],
    ROLE_PSICOLOGO: [
        PERM_VIEW_DASHBOARD, PERM_VIEW_ATENDIMENTOS,
        PERM_CREATE_ATENDIMENTO, PERM_EDIT_ATENDIMENTO,
        PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS,
        PERM_VIEW_AUTOMACOES,
        PERM_VIEW_CONFIGURACOES,
    ],
    ROLE_RECEPCIONISTA: [
        PERM_VIEW_DASHBOARD, PERM_VIEW_ATENDIMENTOS,
        PERM_CREATE_ATENDIMENTO, PERM_EDIT_ATENDIMENTO,
        PERM_VIEW_DOCUMENTOS,
    ],
}

# ─────────────────────────────────────────────────────────────
# Configurações da Clínica — Chaves de preferência
# ─────────────────────────────────────────────────────────────

CLINIC_PREF_NAME: str = "clinic_name"
CLINIC_PREF_LOGO: str = "clinic_logo_base64"
CLINIC_PREF_PHONE: str = "clinic_phone"
CLINIC_PREF_ADDRESS: str = "clinic_address"
CLINIC_PREF_EMAIL: str = "clinic_email"
CLINIC_PREF_THEME: str = "clinic_theme"
CLINIC_PREF_LAYOUT: str = "clinic_layout"
CLINIC_PREF_GOOGLE_DOC_ID: str = "clinic_google_doc_id"
CLINIC_PREF_USER_NAME: str = "user_display_name"
CLINIC_PREF_USER_EMAIL: str = "user_email"
CLINIC_PREF_USER_PHOTO: str = "user_photo_base64"

# Temas disponíveis
AVAILABLE_THEMES: list[str] = ["dark", "light"]
DEFAULT_THEME: str = "dark"
