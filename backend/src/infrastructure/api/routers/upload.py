"""Upload router — file upload and management.

Endpoints for listing, uploading and deleting PDF files stored
in the database.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.repositories.repositories import arquivo_repo
from infrastructure.api.routers.deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/arquivos", tags=["Upload"])
async def list_arquivos(current_user: dict = Depends(get_current_user)):
    """Lista todos os arquivos (PDFs) armazenados no banco."""
    arquivos = arquivo_repo.list_all()
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
    current_user: dict = Depends(get_current_user),
):
    """Faz upload de um PDF para o banco de dados."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome do arquivo inválido.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 50MB.")

    content_type = file.content_type or "application/pdf"
    file_id = arquivo_repo.save(
        filename=file.filename,
        content=content,
        content_type=content_type,
    )
    if not file_id:
        raise HTTPException(status_code=500, detail="Falha ao salvar arquivo.")

    return {"id": file_id, "filename": file.filename, "size": len(content), "mensagem": "Arquivo salvo com sucesso."}


@router.delete("/arquivos/{file_id}", tags=["Upload"])
async def delete_arquivo(
    file_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Remove um arquivo do banco."""
    success = arquivo_repo.delete(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    return {"mensagem": "Arquivo removido com sucesso."}
