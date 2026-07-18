"""Pacientes router — CRUD completo para gestão de pacientes.

Endpoints:
- GET    /api/pacientes              — Lista pacientes (com busca, paginação)
- POST   /api/pacientes              — Cria paciente
- GET    /api/pacientes/{id}         — Detalhes do paciente
- PUT    /api/pacientes/{id}         — Atualiza paciente
- DELETE /api/pacientes/{id}         — Deleta paciente
- POST   /api/pacientes/{id}/photo   — Upload foto
- GET    /api/pacientes/{id}/photo   — Busca foto
- GET    /api/pacientes/{id}/document — Busca documento Google Docs
"""

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from core.repositories.repositories import PacienteRepository, DocumentoRepository
from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_paciente_repo, get_documento_repo
from utils.constants import PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO, PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


class PacienteCreatePayload(BaseModel):
    nome: str
    cpf: str | None = None
    telefone: str | None = None
    email: str | None = None
    data_nascimento: str | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    profissao: str | None = None
    convenio: str | None = None
    numero_convenio: str | None = None
    empresa: str | None = None
    endereco: str | None = None
    contato_emergencia: str | None = None
    telefone_emergencia: str | None = None
    observacoes: str | None = None


class PacienteUpdatePayload(BaseModel):
    nome: str | None = None
    cpf: str | None = None
    telefone: str | None = None
    email: str | None = None
    data_nascimento: str | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    profissao: str | None = None
    convenio: str | None = None
    numero_convenio: str | None = None
    empresa: str | None = None
    endereco: str | None = None
    contato_emergencia: str | None = None
    telefone_emergencia: str | None = None
    observacoes: str | None = None


class PacienteResponse(BaseModel):
    id: int
    nome: str
    slug: str
    cpf: str | None = None
    telefone: str | None = None
    email: str | None = None
    data_nascimento: str | None = None
    sexo: str | None = None
    estado_civil: str | None = None
    profissao: str | None = None
    convenio: str | None = None
    numero_convenio: str | None = None
    empresa: str | None = None
    endereco: str | None = None
    contato_emergencia: str | None = None
    telefone_emergencia: str | None = None
    observacoes: str | None = None
    foto: str | None = None
    criado_em: str | None = None
    atualizado_em: str | None = None


class PacienteResumoResponse(BaseModel):
    id: int
    nome: str
    slug: str
    empresa: str | None = None
    foto: str | None = None
    total_atendimentos: int = 0
    ultimo_atendimento: str | None = None
    status: str | None = None
    modalidades_distintas: int = 0


# ─────────────────────────────────────────────────────────────
# CRUD Endpoints
# ─────────────────────────────────────────────────────────────


@router.get("/pacientes", response_model=list[PacienteResumoResponse], tags=["Pacientes"])
async def list_pacientes(
    q: str | None = None,
    limit: int = 1000,
    offset: int = 0,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    pacientes = await run_sync(paciente_repo.list_resumo, q=q, limit=limit, offset=offset)
    return pacientes


@router.post("/pacientes", response_model=PacienteResponse, tags=["Pacientes"])
async def create_paciente(
    payload: PacienteCreatePayload,
    current_user: dict = Depends(require_permission(PERM_CREATE_ATENDIMENTO)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    from datetime import date as _date
    from core.entities.models import PacienteCreate

    data_nasc = None
    if payload.data_nascimento:
        try:
            data_nasc = _date.fromisoformat(payload.data_nascimento)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data_nascimento inválido. Use YYYY-MM-DD.")

    new_id = await run_sync(
        paciente_repo.create,
        PacienteCreate(
            nome=payload.nome,
            cpf=payload.cpf,
            telefone=payload.telefone,
            email=payload.email,
            data_nascimento=data_nasc,
            sexo=payload.sexo,
            estado_civil=payload.estado_civil,
            profissao=payload.profissao,
            convenio=payload.convenio,
            numero_convenio=payload.numero_convenio,
            empresa=payload.empresa,
            endereco=payload.endereco,
            contato_emergencia=payload.contato_emergencia,
            telefone_emergencia=payload.telefone_emergencia,
            observacoes=payload.observacoes,
        ),
    )
    if not new_id:
        raise HTTPException(status_code=500, detail="Erro ao criar paciente.")

    paciente = await run_sync(paciente_repo.find_by_id, new_id)
    return _paciente_to_response(paciente)


@router.get("/pacientes/{paciente_id}", response_model=PacienteResponse, tags=["Pacientes"])
async def get_paciente(
    paciente_id: int,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    paciente = await run_sync(paciente_repo.find_by_id, paciente_id)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
    return _paciente_to_response(paciente)


@router.put("/pacientes/{paciente_id}", response_model=PacienteResponse, tags=["Pacientes"])
async def update_paciente(
    paciente_id: int,
    payload: PacienteUpdatePayload,
    current_user: dict = Depends(require_permission(PERM_EDIT_ATENDIMENTO)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    from datetime import date as _date
    from core.entities.models import PacienteUpdate

    data_nasc = None
    if payload.data_nascimento:
        try:
            data_nasc = _date.fromisoformat(payload.data_nascimento)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data_nascimento inválido. Use YYYY-MM-DD.")

    success = await run_sync(
        paciente_repo.update,
        paciente_id,
        PacienteUpdate(
            nome=payload.nome,
            cpf=payload.cpf,
            telefone=payload.telefone,
            email=payload.email,
            data_nascimento=data_nasc,
            sexo=payload.sexo,
            estado_civil=payload.estado_civil,
            profissao=payload.profissao,
            convenio=payload.convenio,
            numero_convenio=payload.numero_convenio,
            empresa=payload.empresa,
            endereco=payload.endereco,
            contato_emergencia=payload.contato_emergencia,
            telefone_emergencia=payload.telefone_emergencia,
            observacoes=payload.observacoes,
        ),
    )
    if not success:
        raise HTTPException(status_code=404, detail="Paciente não encontrado ou erro ao atualizar.")

    paciente = await run_sync(paciente_repo.find_by_id, paciente_id)
    return _paciente_to_response(paciente)


@router.delete("/pacientes/{paciente_id}", tags=["Pacientes"])
async def delete_paciente(
    paciente_id: int,
    current_user: dict = Depends(require_permission(PERM_DELETE_ATENDIMENTO)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    success = await run_sync(paciente_repo.delete, paciente_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
    return {"mensagem": "Paciente excluído com sucesso."}


# ─────────────────────────────────────────────────────────────
# Photo Endpoints
# ─────────────────────────────────────────────────────────────


@router.post("/pacientes/{paciente_id}/photo", tags=["Pacientes"])
async def upload_paciente_photo(
    paciente_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission(PERM_EDIT_ATENDIMENTO)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    paciente = await run_sync(paciente_repo.find_by_id, paciente_id)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    max_size = 2 * 1024 * 1024  # 2MB
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="Imagem excede o limite de 2MB.")

    try:
        b64 = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"
        ok = await run_sync(paciente_repo.update_foto, paciente_id, data_uri)
        if not ok:
            raise HTTPException(status_code=500, detail="Falha ao salvar imagem.")
        return {"mensagem": "Foto do paciente salva com sucesso.", "paciente_id": paciente_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao salvar foto do paciente #{paciente_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a imagem.")


@router.get("/pacientes/{paciente_id}/photo", tags=["Pacientes"])
async def get_paciente_photo(
    paciente_id: int,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
):
    photo = await run_sync(paciente_repo.get_foto, paciente_id)
    return {"photo": photo}


# ─────────────────────────────────────────────────────────────
# Document Endpoint
# ─────────────────────────────────────────────────────────────


@router.get("/pacientes/{paciente_id}/document", tags=["Pacientes"])
async def get_paciente_document(
    paciente_id: int,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    paciente_repo: PacienteRepository = Depends(get_paciente_repo),
    documento_repo: DocumentoRepository = Depends(get_documento_repo),
):
    """Retorna o google_doc_id mais recente associado ao paciente via seus atendimentos."""
    from core.repositories.repositories import atendimento_repo
    from core.entities.models import AtendimentoFilter

    atendimentos = await run_sync(
        atendimento_repo.list_all,
        AtendimentoFilter(limit=500),
    )
    paciente_atendimentos = [a for a in atendimentos if a.paciente_id == paciente_id]

    for a in paciente_atendimentos:
        doc = await run_sync(documento_repo.find_by_atendimento, a.id)
        if doc:
            return {"google_doc_id": doc.google_doc_id, "db_id": doc.id, "titulo": doc.titulo}

    raise HTTPException(status_code=404, detail="Documento não encontrado para esse paciente.")


# ─────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────


def _paciente_to_response(paciente) -> dict:
    return {
        "id": paciente.id,
        "nome": paciente.nome,
        "slug": paciente.slug,
        "cpf": paciente.cpf,
        "telefone": paciente.telefone,
        "email": paciente.email,
        "data_nascimento": str(paciente.data_nascimento) if paciente.data_nascimento else None,
        "sexo": paciente.sexo,
        "estado_civil": paciente.estado_civil,
        "profissao": paciente.profissao,
        "convenio": paciente.convenio,
        "numero_convenio": paciente.numero_convenio,
        "empresa": paciente.empresa,
        "endereco": paciente.endereco,
        "contato_emergencia": paciente.contato_emergencia,
        "telefone_emergencia": paciente.telefone_emergencia,
        "observacoes": paciente.observacoes,
        "foto": paciente.foto,
        "criado_em": paciente.criado_em.isoformat() if paciente.criado_em else None,
        "atualizado_em": paciente.atualizado_em.isoformat() if paciente.atualizado_em else None,
    }
