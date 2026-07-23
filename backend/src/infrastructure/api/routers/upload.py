"""Upload router — file upload and management.

Endpoints for listing, uploading and deleting PDF files stored
in the database.
"""

import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.repositories.repositories import ArquivoRepository
from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_arquivo_repo
from utils.constants import PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS

router = APIRouter(prefix="/api")

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}

_MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50MB


def _sanitize_filename(name: str) -> str:
    """Remove path separators and dangerous chars from filename."""
    name = re.sub(r"[^a-zA-Z0-9_\-. ]", "_", name)
    return name.strip("_. ")[:255] or "arquivo"


@router.get("/arquivos", tags=["Upload"])
async def list_arquivos(
    current_user: dict = Depends(require_permission(PERM_VIEW_DOCUMENTOS)),
    arquivo_repo: ArquivoRepository = Depends(get_arquivo_repo),
):
    """Lista todos os arquivos (PDFs) armazenados no banco."""
    arquivos = await run_sync(arquivo_repo.list_all)
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "content_type": a.content_type,
            "size": a.size,
            "size_kb": round(a.size / 1024, 1),
            "criado_em": a.criado_em.isoformat() if a.criado_em else None,
        }
        for a in arquivos
    ]


@router.post("/arquivos", tags=["Upload"])
async def upload_arquivo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission(PERM_MANAGE_DOCUMENTOS)),
    arquivo_repo: ArquivoRepository = Depends(get_arquivo_repo),
):
    """Faz upload de um arquivo para o banco de dados."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome do arquivo inválido.")

    safe_name = _sanitize_filename(file.filename)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(content) > _MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 50MB.")

    content_type = file.content_type or "application/pdf"
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo '{content_type}' não permitido. Tipos aceitos: {', '.join(sorted(_ALLOWED_CONTENT_TYPES))}",
        )

    file_id = await run_sync(arquivo_repo.save,
        filename=safe_name,
        content=content,
        content_type=content_type,
    )
    if not file_id:
        raise HTTPException(status_code=500, detail="Falha ao salvar arquivo.")

    return {"id": file_id, "filename": safe_name, "size": len(content), "mensagem": "Arquivo salvo com sucesso."}


@router.delete("/arquivos/{file_id}", tags=["Upload"])
async def delete_arquivo(
    file_id: int,
    current_user: dict = Depends(require_permission(PERM_MANAGE_DOCUMENTOS)),
    arquivo_repo: ArquivoRepository = Depends(get_arquivo_repo),
):
    """Remove um arquivo do banco."""
    success = await run_sync(arquivo_repo.delete, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return {"mensagem": "Arquivo removido com sucesso."}
