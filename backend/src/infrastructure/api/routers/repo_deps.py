"""Dependency injection for repositories.

Provides ``Depends``-compatible factory functions for each repository.
Use in routers::

    @router.get("/items")
    async def list_items(repo: AtendimentoRepository = Depends(get_atendimento_repo)):
        return repo.list_all()

The factories return the existing singleton instances, so there is no
behavioural change — only the wiring becomes explicit and testable.
"""

from core.repositories.repositories import (
    AtendimentoRepository,
    ArquivoRepository,
    PreferencesRepository,
    DocumentoRepository,
    AuditoriaRepository,
    TemporaryPermissionRepository,
    atendimento_repo,
    arquivo_repo,
    preferences_repo,
    documento_repo,
    auditoria_repo,
    temporary_permission_repo,
)
from core.repositories.user_repositories import (
    UserRepository,
    ClinicConfigRepository,
    user_repo,
    clinic_config_repo,
)


def get_atendimento_repo() -> AtendimentoRepository:
    return atendimento_repo


def get_arquivo_repo() -> ArquivoRepository:
    return arquivo_repo


def get_preferences_repo() -> PreferencesRepository:
    return preferences_repo


def get_documento_repo() -> DocumentoRepository:
    return documento_repo


def get_auditoria_repo() -> AuditoriaRepository:
    return auditoria_repo


def get_temporary_permission_repo() -> TemporaryPermissionRepository:
    return temporary_permission_repo


def get_user_repo() -> UserRepository:
    return user_repo


def get_clinic_config_repo() -> ClinicConfigRepository:
    return clinic_config_repo
