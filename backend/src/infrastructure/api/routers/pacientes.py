"""Pacientes router — patient-specific endpoints.

Photo upload/retrieval and document lookup for individual patients.
"""

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.repositories.repositories import PreferencesRepository, DocumentoRepository
from infrastructure.api.routers.deps import get_current_user, run_sync
from infrastructure.api.routers.repo_deps import get_preferences_repo, get_documento_repo
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


@router.post("/pacientes/{slug}/photo", tags=["Pacientes"])
async def upload_paciente_photo(
    slug: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    preferences_repo: PreferencesRepository = Depends(get_preferences_repo),
):
    """Faz upload de foto de paciente e salva em preferences como data-uri."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    try:
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"
        key = f"patient_photo:{slug}"
        ok = await run_sync(preferences_repo.save, key, data_uri)
        if not ok:
            raise HTTPException(status_code=500, detail="Falha ao salvar imagem.")
        return {"mensagem": "Foto do paciente salva com sucesso.", "slug": slug}
    except Exception as e:
        logger.error(f"Erro ao salvar foto de paciente {slug}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a imagem.")


@router.get("/pacientes/{slug}/photo", tags=["Pacientes"])
async def get_paciente_photo(
    slug: str,
    current_user: dict = Depends(get_current_user),
    preferences_repo: PreferencesRepository = Depends(get_preferences_repo),
):
    key = f"patient_photo:{slug}"
    photo = await run_sync(preferences_repo.get, key, None)
    return {"photo": photo}


@router.get("/pacientes/{atendimento_id}/document", tags=["Pacientes"])
async def get_paciente_document(
    atendimento_id: int,
    current_user: dict = Depends(get_current_user),
    documento_repo: DocumentoRepository = Depends(get_documento_repo),
):
    """Retorna o `google_doc_id` mais recente associado ao atendimento/paciente."""
    doc = await run_sync(documento_repo.find_by_atendimento, atendimento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado para esse atendimento.")
    return {"google_doc_id": doc.google_doc_id, "db_id": doc.id, "titulo": doc.titulo}
