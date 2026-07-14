"""Docs router — Google Docs embed and revoke endpoints.

Creates temporary or public embed links for Google Docs and revokes
permissions previously granted via the Drive API.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.repositories.repositories import TemporaryPermissionRepository
from utils.logger import get_logger

from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_temporary_permission_repo
from utils.constants import PERM_MANAGE_DOCUMENTOS

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


class DocsEmbedRequest(BaseModel):
    doc_id: str
    make_public: bool = False
    temporary_minutes: Optional[int] = None


class DocsRevokeRequest(BaseModel):
    doc_id: str
    permission_id: str
    db_id: Optional[int] = None


@router.post("/docs/embed", tags=["Docs"])
async def create_doc_embed_link(
    payload: DocsEmbedRequest,
    current_user: dict = Depends(require_permission(PERM_MANAGE_DOCUMENTOS)),
    temporary_permission_repo: TemporaryPermissionRepository = Depends(get_temporary_permission_repo),
):
    """Retorna uma URL de edição/incorporação para um Google Doc.

    Se `make_public=True`, tenta criar uma permissão `anyoneWithLink`=writer
    usando as credenciais de service account carregadas pelo `credentials_loader`.
    """
    try:
        from services.credentials_loader import load_credentials
        creds = load_credentials()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Não foi possível carregar credenciais: {e}")

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google API client não disponível: {e}")

    try:
        scopes = [
            "https://www.googleapis.com/auth/drive",
        ]
        sa_creds = service_account.Credentials.from_service_account_info(creds, scopes=scopes)
        drive = build("drive", "v3", credentials=sa_creds, cache_discovery=False)

        edit_url = f"https://docs.google.com/document/d/{payload.doc_id}/edit"

        result: dict = {"edit_url": edit_url, "embed_url": edit_url}

        # Se pedir make_public sem tempo, cria permissão anyone writer (risco de segurança)
        if payload.make_public and not getattr(payload, "temporary_minutes", None):
            try:
                perm = drive.permissions().create(
                    fileId=payload.doc_id,
                    body={"type": "anyone", "role": "writer"},
                    fields="id,role,type",
                ).execute()
                result["permission_id"] = perm.get("id")
            except Exception as e:
                logger.warning(f"Falha ao criar permissão pública: {e}")

        # Suporte a permissões temporárias: cria permissão e retorna id + expiração
        temp_minutes = getattr(payload, "temporary_minutes", None)
        if temp_minutes:
            try:
                perm = drive.permissions().create(
                    fileId=payload.doc_id,
                    body={"type": "anyone", "role": "writer"},
                    fields="id,role,type",
                ).execute()
                import datetime

                expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=int(temp_minutes))).isoformat() + "Z"
                result["permission_id"] = perm.get("id")
                result["expires_at"] = expires_at
                # registra no banco para revogação automática posterior
                try:
                    created_by = current_user.get("sub")
                    await run_sync(temporary_permission_repo.create, payload.doc_id, perm.get("id"), created_by, expires_at)
                except Exception as e:
                    logger.warning(f"Falha ao registrar permissão temporária no banco: {e}")
            except Exception as e:
                logger.warning(f"Falha ao criar permissão temporária: {e}")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao preparar link do documento: {e}")


@router.post("/docs/revoke", tags=["Docs"])
async def revoke_doc_permission(
    payload: DocsRevokeRequest,
    current_user: dict = Depends(require_permission(PERM_MANAGE_DOCUMENTOS)),
    temporary_permission_repo: TemporaryPermissionRepository = Depends(get_temporary_permission_repo),
):
    """Revoga uma permissão criada anteriormente no Drive."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from services.credentials_loader import load_credentials

        scopes = ["https://www.googleapis.com/auth/drive"]
        sa_creds = service_account.Credentials.from_service_account_info(load_credentials(), scopes=scopes)
        drive = build("drive", "v3", credentials=sa_creds, cache_discovery=False)
        drive.permissions().delete(fileId=payload.doc_id, permissionId=payload.permission_id).execute()
        # marca como revogada no banco se existir
        try:
            await run_sync(temporary_permission_repo.mark_revoked, payload.db_id) if payload.db_id else None
        except Exception:
            pass
        return {"revoked": True}
    except Exception as e:
        logger.warning(f"Falha ao revogar permissão: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao revogar permissão: {e}")
