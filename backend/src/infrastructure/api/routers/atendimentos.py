"""Atendimentos router — CRUD for atendimentos and patient list.

Endpoints for listing, creating, updating and deleting atendimentos,
as well as the ``list_pacientes`` summary endpoint.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.repositories.repositories import AtendimentoRepository, PreferencesRepository
from infrastructure.api.routers.deps import _slug_name, require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_atendimento_repo, get_preferences_repo
from utils.constants import (
    PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO,
    PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO,
)

router = APIRouter(prefix="/api")


class AtendimentoResponse(BaseModel):
    id: int
    empresa: str
    nome: str
    modalidade: str
    data: str
    hora: str
    status: str


class PaginatedAtendimentos(BaseModel):
    items: list[AtendimentoResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class AtendimentoPayload(BaseModel):
    empresa: str
    nome: str
    modalidade: str
    data: str
    hora: str
    status: Optional[str] = "Agendado"


class PacienteResponse(BaseModel):
    id: int
    nome: str
    empresa: Optional[str] = None
    total_atendimentos: int = 0
    ultimo_atendimento: Optional[str] = None
    status: Optional[str] = None
    modalidades_distintas: int = 0
    foto: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Atendimentos Endpoints
# ─────────────────────────────────────────────────────────────


@router.get(
    "/atendimentos",
    response_model=PaginatedAtendimentos,
    tags=["Atendimentos"],
)
async def list_atendimentos(
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
    preferences_repo: PreferencesRepository = Depends(get_preferences_repo),
):
    """Lista atendimentos com busca server-side e paginação."""
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=min(limit, 500), offset=offset)
    if q:
        filters.nome = q
        filters.empresa = q

    atendimentos = await run_sync(atendimento_repo.list_all, filters=filters)
    total = await run_sync(atendimento_repo.count, filters=filters) if hasattr(atendimento_repo, 'count') else len(atendimentos)

    nomes = {_slug_name(a.nome) for a in atendimentos}
    fotos: dict = {}
    if nomes:
        all_fotos = await run_sync(preferences_repo.get_many, "patient_photo:")
        fotos = {k: v for k, v in all_fotos.items() if any(n in k for n in nomes)}

    items = [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%Y-%m-%d") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
            "foto": fotos.get(f"patient_photo:{_slug_name(a.nome)}"),
        }
        for a in atendimentos
    ]

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total,
    }


@router.get("/pacientes", response_model=list[PacienteResponse], tags=["Pacientes"])
async def list_pacientes(
    q: Optional[str] = None,
    limit: int = 1000,
    offset: int = 0,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
    preferences_repo: PreferencesRepository = Depends(get_preferences_repo),
):
    pacientes = await run_sync(atendimento_repo.list_pacientes_resumo, q=q, limit=limit, offset=offset)
    fotos: dict = await run_sync(preferences_repo.get_many, "patient_photo:")
    return [
        {
            "id": p["id"],
            "nome": p["nome"],
            "empresa": p.get("empresa"),
            "total_atendimentos": p.get("total_atendimentos", 0),
            "ultimo_atendimento": p["ultimo_atendimento"].strftime("%Y-%m-%d") if p.get("ultimo_atendimento") else None,
            "status": p.get("status"),
            "modalidades_distintas": p.get("modalidades_distintas", 0),
            "foto": fotos.get(f"patient_photo:{_slug_name(p['nome'])}"),
        }
        for p in pacientes
    ]


@router.post("/atendimentos", tags=["Atendimentos"])
async def create_atendimento(
    payload: AtendimentoPayload,
    current_user: dict = Depends(require_permission(PERM_CREATE_ATENDIMENTO)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    from datetime import date, time
    from core.entities.models import AtendimentoCreate

    try:
        new_id = await run_sync(atendimento_repo.create, AtendimentoCreate(
            empresa=payload.empresa,
            nome=payload.nome,
            modalidade=payload.modalidade,
            data=date.fromisoformat(payload.data),
            hora=time.fromisoformat(payload.hora),
            status=payload.status or "Agendado",
        ))
        if not new_id:
            raise HTTPException(status_code=500, detail="Erro ao criar atendimento.")
        return {"id": new_id, "mensagem": "Atendimento criado com sucesso."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data ou hora inválido.")


@router.put("/atendimentos/{atendimento_id}", tags=["Atendimentos"])
async def update_atendimento(
    atendimento_id: int,
    payload: AtendimentoPayload,
    current_user: dict = Depends(require_permission(PERM_EDIT_ATENDIMENTO)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    from datetime import date, time
    from core.entities.models import AtendimentoUpdate

    try:
        success = await run_sync(atendimento_repo.update, atendimento_id, AtendimentoUpdate(
            empresa=payload.empresa,
            nome=payload.nome,
            modalidade=payload.modalidade,
            data=date.fromisoformat(payload.data),
            hora=time.fromisoformat(payload.hora),
            status=payload.status or "Agendado",
        ))
        if not success:
            raise HTTPException(status_code=404, detail="Atendimento não encontrado ou erro ao atualizar.")
        return {"mensagem": "Atendimento atualizado com sucesso."}
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data ou hora inválido.")


@router.delete("/atendimentos/{atendimento_id}", tags=["Atendimentos"])
async def delete_atendimento(
    atendimento_id: int,
    current_user: dict = Depends(require_permission(PERM_DELETE_ATENDIMENTO)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    success = await run_sync(atendimento_repo.delete, atendimento_id)
    if not success:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado.")
    return {"mensagem": "Atendimento excluído com sucesso."}


# ─────────────────────────────────────────────────────────────
# Batch Operations
# ─────────────────────────────────────────────────────────────

class BatchStatusPayload(BaseModel):
    ids: list[int]
    status: str


@router.post("/atendimentos/batch/status", tags=["Atendimentos"])
async def batch_update_status(
    payload: BatchStatusPayload,
    current_user: dict = Depends(require_permission(PERM_EDIT_ATENDIMENTO)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    """Atualiza o status de múltiplos atendimentos de uma vez."""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado.")
    if len(payload.ids) > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 IDs por operação batch.")

    updated = 0
    for aid in payload.ids:
        from datetime import date as _d, time as _t
        existing = await run_sync(atendimento_repo.get_by_id, aid)
        if existing:
            ok = await run_sync(atendimento_repo.update, aid, AtendimentoUpdate(
                empresa=existing.empresa,
                nome=existing.nome,
                modalidade=existing.modalidade,
                data=existing.data,
                hora=existing.hora,
                status=payload.status,
            ))
            if ok:
                updated += 1
    return {"updated": updated, "total": len(payload.ids)}


class BatchDeletePayload(BaseModel):
    ids: list[int]


@router.post("/atendimentos/batch/delete", tags=["Atendimentos"])
async def batch_delete(
    payload: BatchDeletePayload,
    current_user: dict = Depends(require_permission(PERM_DELETE_ATENDIMENTO)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    """Exclui múltiplos atendimentos de uma vez."""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado.")
    if len(payload.ids) > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 IDs por operação batch.")

    deleted = 0
    for aid in payload.ids:
        ok = await run_sync(atendimento_repo.delete, aid)
        if ok:
            deleted += 1
    return {"deleted": deleted, "total": len(payload.ids)}
