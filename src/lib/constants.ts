export const APP_VERSION = "3.0.0";

export const TABLE_USERS = "users";
export const TABLE_PACIENTES = "pacientes";
export const TABLE_ATENDIMENTOS = "atendimentos";
export const TABLE_ARQUIVOS = "arquivos";
export const TABLE_AUDITORIA = "auditoria";
export const TABLE_PREFERENCES = "user_preferences";
export const TABLE_DOCUMENTOS = "documentos";
export const TABLE_TEMP_PERMISSIONS = "temporary_permissions";
export const TABLE_CONSENTIMENTOS = "consentimentos";
export const TABLE_LOGIN_ATTEMPTS = "login_attempts";
export const TABLE_ESQUECIMENTOS = "lgpd_esquecimentos";
export const TABLE_LGPD_CONFIG = "lgpd_config";
export const TABLE_NOTAS = "notas";

export const MODALIDADES = [
  "Psicologia Clínica",
  "Psicologia do Trabalho",
  "Avaliação Psicológica",
  "Psicologia Escolar",
  "Psicologia Hospitalar",
  "Neuropsicologia",
  "Psicopedagogia",
  "Terapia Cognitivo-Comportamental",
  "Psicanálise",
  "Aconselhamento Psicológico",
];

export const STATUS_ATENDIMENTO = [
  "Agendado",
  "Confirmado",
  "Atendido",
  "Concluído",
  "Cancelado",
  "Faltou",
  "Reagendado",
];

export const ROLE_ADMIN = "admin";
export const ROLE_PSICOLOGO = "psicologo";
export const ROLE_RECEPCIONISTA = "recepcionista";

export const PERM_VIEW_DASHBOARD = "view_dashboard";
export const PERM_VIEW_ATENDIMENTOS = "view_atendimentos";
export const PERM_CREATE_ATENDIMENTO = "create_atendimento";
export const PERM_EDIT_ATENDIMENTO = "edit_atendimento";
export const PERM_DELETE_ATENDIMENTO = "delete_atendimento";
export const PERM_VIEW_DOCUMENTOS = "view_documentos";
export const PERM_MANAGE_DOCUMENTOS = "manage_documentos";
export const PERM_VIEW_AUTOMACOES = "view_automacoes";
export const PERM_TRIGGER_AUTOMACOES = "trigger_automacoes";
export const PERM_VIEW_CONFIGURACOES = "view_configuracoes";
export const PERM_MANAGE_CONFIGURACOES = "manage_configuracoes";
export const PERM_VIEW_LOGS = "view_logs";
export const PERM_MANAGE_USERS = "manage_users";

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE_ADMIN]: [
    PERM_VIEW_DASHBOARD,
    PERM_VIEW_ATENDIMENTOS,
    PERM_CREATE_ATENDIMENTO,
    PERM_EDIT_ATENDIMENTO,
    PERM_DELETE_ATENDIMENTO,
    PERM_VIEW_DOCUMENTOS,
    PERM_MANAGE_DOCUMENTOS,
    PERM_VIEW_AUTOMACOES,
    PERM_TRIGGER_AUTOMACOES,
    PERM_VIEW_CONFIGURACOES,
    PERM_MANAGE_CONFIGURACOES,
    PERM_VIEW_LOGS,
    PERM_MANAGE_USERS,
  ],
  [ROLE_PSICOLOGO]: [
    PERM_VIEW_DASHBOARD,
    PERM_VIEW_ATENDIMENTOS,
    PERM_CREATE_ATENDIMENTO,
    PERM_EDIT_ATENDIMENTO,
    PERM_VIEW_DOCUMENTOS,
    PERM_MANAGE_DOCUMENTOS,
    PERM_VIEW_AUTOMACOES,
    PERM_VIEW_CONFIGURACOES,
  ],
  [ROLE_RECEPCIONISTA]: [
    PERM_VIEW_DASHBOARD,
    PERM_VIEW_ATENDIMENTOS,
    PERM_CREATE_ATENDIMENTO,
    PERM_EDIT_ATENDIMENTO,
    PERM_VIEW_DOCUMENTOS,
  ],
};

export const CLINIC_PREF_USER_PHOTO = "user_photo";
export const CLINIC_PREF_LOGO = "clinic_logo";
export const CLINIC_PREF_GOOGLE_DOC_ID = "clinic_google_doc_id";
