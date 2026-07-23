"""Laudos router — report generation and management.

Endpoints for listing, generating, exporting (PDF) and checking the
template status of clinical reports (laudos) backed by Google Docs.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from core.entities.models import DocumentoCreate
from core.repositories.repositories import DocumentoRepository
from utils.logger import get_logger

from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_documento_repo
from utils.constants import PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


def _format_date_br(value: str) -> str:
    """Converte YYYY-MM-DD para DD/MM/YYYY; mantém DD/MM/YYYY."""
    value = (value or "").strip()
    if not value:
        return ""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return value


class LaudoPayload(BaseModel):
    nome_paciente: str = Field(..., min_length=2)
    data_nascimento: str = Field(..., description="YYYY-MM-DD ou DD/MM/YYYY")
    cpf: str = Field(..., min_length=11)
    empresa: str = ""
    data_exame: str = Field(..., description="YYYY-MM-DD ou DD/MM/YYYY")
    motivo_avaliacao: str = ""
    avaliacao_psicologica: bool = False
    admissional: bool = False
    periodica: bool = False
    pessoal: bool = False
    mudanca_funcao: bool = False
    itens_auxiliados: str = ""
    conclusao: str = ""
    psicologista_nome: str = "Dr. Psicólogo"
    psicologista_crp: str = Field(..., min_length=5, description="Registro profissional do CRP")


class LaudoResponse(BaseModel):
    id: str
    titulo: str
    url: str
    embed_url: str


@router.get("/laudos", tags=["Laudos"])
async def list_laudos(
    current_user: dict = Depends(require_permission(PERM_VIEW_DOCUMENTOS)),
    documento_repo: DocumentoRepository = Depends(get_documento_repo),
):
    """Lista todos os laudos gerados e persistidos no banco."""
    from services.google_docs_service import google_docs_service

    documentos = await run_sync(documento_repo.list_all)
    return [
        {
            "id": d.google_doc_id,
            "db_id": d.id,
            "titulo": d.titulo,
            "paciente": d.titulo.replace("Laudo - ", "", 1),
            "tipo": "Laudo",
            "data": d.criado_em.strftime("%d/%m/%Y") if d.criado_em else "",
            "status": "Gerado",
            "url": d.view_url,
            "embed_url": google_docs_service.get_embed_url(d.google_doc_id),
        }
        for d in documentos
        if d.tipo == "laudo"
    ]


@router.post("/laudos/gerar", response_model=LaudoResponse, tags=["Laudos"])
async def gerar_laudo(
    payload: LaudoPayload,
    current_user: dict = Depends(require_permission(PERM_MANAGE_DOCUMENTOS)),
    documento_repo: DocumentoRepository = Depends(get_documento_repo),
):
    """Copia o template Google Docs, preenche os campos e persiste no banco."""
    from services.laudo_service import DadosLaudo, get_laudo_service
    from services.google_docs_service import google_docs_service

    try:
        dados = DadosLaudo(
            nome_paciente=payload.nome_paciente.strip(),
            data_nascimento=_format_date_br(payload.data_nascimento),
            cpf=payload.cpf.strip(),
            empresa=payload.empresa.strip(),
            data_exame=_format_date_br(payload.data_exame),
            motivo_avaliacao=payload.motivo_avaliacao.strip(),
            avaliacao_psicologica=payload.avaliacao_psicologica,
            admissional=payload.admissional,
            periodica=payload.periodica,
            pessoal=payload.pessoal,
            mudanca_funcao=payload.mudanca_funcao,
            itens_auxiliados=payload.itens_auxiliados.strip(),
            conclusao=payload.conclusao.strip(),
            psicologista_nome=payload.psicologista_nome.strip(),
            psicologista_crp=payload.psicologista_crp.strip(),
        )
        laudo_service = get_laudo_service()
        novo_doc = laudo_service.gerar_laudo(dados)
        doc_id = novo_doc["id"]
        titulo = novo_doc.get("title", f"Laudo - {payload.nome_paciente}")

        await run_sync(documento_repo.create, DocumentoCreate(
            titulo=titulo,
            google_doc_id=doc_id,
            tipo="laudo",
        ))

        return {
            "id": doc_id,
            "titulo": titulo,
            "url": novo_doc["url"],
            "embed_url": google_docs_service.get_embed_url(doc_id),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao gerar laudo: {e}")
        raise HTTPException(
            status_code=503,
            detail="Falha ao gerar laudo. Verifique credenciais Google e template configurado.",
        )


@router.get("/laudos/{doc_id}/pdf", tags=["Laudos"])
async def exportar_laudo_pdf(
    doc_id: str,
    current_user: dict = Depends(require_permission(PERM_VIEW_DOCUMENTOS)),
):
    """Exporta um laudo Google Docs como PDF."""
    import io
    import tempfile
    from pathlib import Path

    from services.laudo_service import get_laudo_service

    try:
        laudo_service = get_laudo_service()
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = str(Path(tmp) / f"laudo_{doc_id}.pdf")
            laudo_service.api.export_as_pdf(doc_id, pdf_path)
            content = Path(pdf_path).read_bytes()
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="laudo_{doc_id}.pdf"'},
        )
    except Exception as e:
        logger.error(f"Erro ao exportar PDF do laudo {doc_id}: {e}")
        raise HTTPException(status_code=503, detail="Falha ao exportar PDF do laudo.")


@router.get("/laudos/template-status", tags=["Laudos"])
async def laudo_template_status(current_user: dict = Depends(require_permission(PERM_VIEW_DOCUMENTOS))):
    """Verifica se o template Google Docs está configurado."""
    from services.laudo_service import resolve_template_id
    from services.google_docs_service import google_docs_service

    try:
        template_id = resolve_template_id()
        return {
            "configurado": True,
            "template_id": template_id,
            "embed_url": google_docs_service.get_embed_url(template_id),
        }
    except ValueError as e:
        return {"configurado": False, "erro": str(e)}
