"""Configurações router — clinic settings and audit log.

Endpoints for reading/updating clinic configuration, uploading
profile/logo images, and retrieving the audit log.
"""

import base64
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core.repositories.repositories import AuditoriaRepository
from core.repositories.user_repositories import UserRepository, ClinicConfigRepository
from infrastructure.api.routers.deps import get_current_user, require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_auditoria_repo, get_user_repo, get_clinic_config_repo
from utils.constants import CLINIC_PREF_USER_PHOTO, CLINIC_PREF_LOGO
from utils.constants import PERM_VIEW_CONFIGURACOES, PERM_MANAGE_CONFIGURACOES, PERM_VIEW_LOGS
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


class ConfigClinicaUpdate(BaseModel):
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_email: Optional[str] = None
    clinic_google_doc_id: Optional[str] = None
    user_display_name: Optional[str] = None
    user_email: Optional[str] = None


@router.get("/config/options", tags=["Configuracoes"])
async def get_config_options(
    current_user: dict = Depends(get_current_user),
):
    """Retorna as opções de modalidade e status disponíveis no sistema."""
    from utils.constants import MODALIDADES, STATUS_ATENDIMENTO
    return {
        "modalidades": MODALIDADES,
        "status": STATUS_ATENDIMENTO,
    }


@router.get("/configuracoes", tags=["Configurações"])
async def get_configuracoes(
    current_user: dict = Depends(require_permission(PERM_VIEW_CONFIGURACOES)),
    clinic_config_repo: ClinicConfigRepository = Depends(get_clinic_config_repo),
    user_repo: UserRepository = Depends(get_user_repo),
):
    """Retorna todas as configurações da clínica."""
    config = await run_sync(clinic_config_repo.get_all_clinic_data)
    username = current_user.get("sub", "")
    user = await run_sync(user_repo.find_by_username, username)
    return {
        "clinica": config,
        "usuario": {
            "id": user.id if user else None,
            "username": user.username if user else username,
            "display_name": user.display_name if user else "",
            "email": user.email if user else "",
            "role": user.role if user else "admin",
            "created_at": user.created_at.isoformat() if user and user.created_at else None,
            "last_login": user.last_login.isoformat() if user and user.last_login else None,
        },
    }


@router.put("/configuracoes", tags=["Configurações"])
async def update_configuracoes(
    body: ConfigClinicaUpdate,
    current_user: dict = Depends(require_permission(PERM_MANAGE_CONFIGURACOES)),
    clinic_config_repo: ClinicConfigRepository = Depends(get_clinic_config_repo),
):
    """Salva configurações da clínica."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        return {"mensagem": "Nenhuma configuração para salvar."}
    success = await run_sync(clinic_config_repo.save_clinic_data, data)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao salvar configurações.")
    return {"mensagem": "Configurações salvas com sucesso.", "campos_salvos": list(data.keys())}


@router.post("/configuracoes/photo", tags=["Configurações"])
async def upload_config_photo(
    field: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission(PERM_MANAGE_CONFIGURACOES)),
    clinic_config_repo: ClinicConfigRepository = Depends(get_clinic_config_repo),
):
    """Faz upload de imagem (logo ou foto do usuário) e salva como data-uri na configuração."""
    if field not in ("user_photo", "clinic_logo"):
        raise HTTPException(status_code=400, detail="Campo inválido. Use 'user_photo' ou 'clinic_logo'.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    max_size = 2 * 1024 * 1024  # 2MB
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="Imagem excede o limite de 2MB.")

    try:
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"
        key = CLINIC_PREF_USER_PHOTO if field == "user_photo" else CLINIC_PREF_LOGO
        ok = await run_sync(clinic_config_repo.save_clinic_data, {key: data_uri})
        if not ok:
            raise HTTPException(status_code=500, detail="Falha ao salvar imagem.")
        return {"mensagem": "Imagem salva com sucesso.", "field": field}
    except Exception as e:
        logger.error(f"Erro ao salvar imagem de configuração: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a imagem.")


@router.get("/auditoria", tags=["Configurações"])
async def get_auditoria(
    limit: int = 50,
    current_user: dict = Depends(require_permission(PERM_VIEW_LOGS)),
    auditoria_repo: AuditoriaRepository = Depends(get_auditoria_repo),
):
    """Retorna o log de auditoria do sistema."""
    entradas = await run_sync(auditoria_repo.listar, limit=min(limit, 200))
    return [
        {
            "id": e.id,
            "acao": e.acao,
            "entidade": e.entidade,
            "entidade_id": e.entidade_id,
            "detalhes": e.detalhes,
            "usuario": e.usuario,
            "criado_em": e.criado_em.isoformat() if e.criado_em else None,
        }
        for e in entradas
    ]


from utils.constants import ROLE_ADMIN

@router.post("/admin/retention/cleanup", tags=["Admin"])
async def retention_cleanup(
    audit_days: int = 365,
    login_days: int = 90,
    current_user: dict = Depends(require_permission(PERM_MANAGE_CONFIGURACOES)),
):
    """Executa limpeza de dados antigos (LGPD minimização / auditoria)."""
    from infrastructure.connection import cleanup_old_audit_logs, cleanup_old_login_attempts
    audit_removed = await run_sync(cleanup_old_audit_logs, audit_days)
    login_removed = await run_sync(cleanup_old_login_attempts, login_days)
    return {
        "audit_logs_removed": audit_removed,
        "login_attempts_removed": login_removed,
        "audit_retention_days": audit_days,
        "login_retention_days": login_days,
    }
