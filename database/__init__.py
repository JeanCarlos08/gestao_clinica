"""Pacote de banco de dados do sistema mvpdepsicologia."""
from .connection import (
    get_connection,
    connection_scope,
    ensure_schema,
    check_connection,
    get_diagnostics,
)
from .models import (
    Atendimento,
    AtendimentoCreate,
    AtendimentoUpdate,
    AtendimentoFilter,
    Arquivo,
    Nota,
    NotaCreate,
    AuditoriaEntry,
    Documento,
    DocumentoCreate,
    DashboardStats,
)
from .repositories import (
    atendimento_repo,
    arquivo_repo,
    preferences_repo,
    documento_repo,
    auditoria_repo,
)

__all__ = [
    "get_connection", "connection_scope", "ensure_schema",
    "check_connection", "get_diagnostics",
    "Atendimento", "AtendimentoCreate", "AtendimentoUpdate",
    "AtendimentoFilter", "Arquivo", "Nota", "NotaCreate",
    "AuditoriaEntry", "Documento", "DocumentoCreate", "DashboardStats",
    "atendimento_repo", "arquivo_repo", "preferences_repo",
    "documento_repo", "auditoria_repo",
]
