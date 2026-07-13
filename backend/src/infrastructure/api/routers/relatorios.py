"""Relatórios router — report statistics and filtered atendimentos.

Provides detailed stats with optional date-range filtering and the
filtered atendimentos list used for report generation.
"""

from typing import Optional

from fastapi import APIRouter, Depends

from core.repositories.repositories import atendimento_repo
from infrastructure.api.routers.deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/relatorios/stats", tags=["Relatórios"])
async def get_relatorios_stats(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Estatísticas detalhadas para relatórios, com filtro opcional por período.
    Retorna contagens por status, modalidade e empresa.
    """
    from datetime import date
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=5000)
    if data_inicio:
        try:
            filters.data_inicio = date.fromisoformat(data_inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            filters.data_fim = date.fromisoformat(data_fim)
        except ValueError:
            pass

    atendimentos = atendimento_repo.list_all(filters=filters)

    por_status: dict = {}
    por_modalidade: dict = {}
    por_empresa: dict = {}
    por_mes: dict = {}

    for a in atendimentos:
        por_status[a.status] = por_status.get(a.status, 0) + 1
        por_modalidade[a.modalidade] = por_modalidade.get(a.modalidade, 0) + 1
        por_empresa[a.empresa] = por_empresa.get(a.empresa, 0) + 1
        if a.data:
            mes_key = a.data.strftime("%Y-%m")
            por_mes[mes_key] = por_mes.get(mes_key, 0) + 1

    top_empresas = dict(
        sorted(por_empresa.items(), key=lambda x: x[1], reverse=True)[:10]
    )
    por_mes_sorted = dict(sorted(por_mes.items()))

    return {
        "total": len(atendimentos),
        "por_status": por_status,
        "por_modalidade": por_modalidade,
        "por_empresa": top_empresas,
        "por_mes": por_mes_sorted,
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim,
        },
    }


@router.get("/relatorios/atendimentos", tags=["Relatórios"])
async def get_relatorios_atendimentos(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    modalidade: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Lista de atendimentos filtrada para geração de relatórios."""
    from datetime import date
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=5000, status=status, modalidade=modalidade)
    if data_inicio:
        try:
            filters.data_inicio = date.fromisoformat(data_inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            filters.data_fim = date.fromisoformat(data_fim)
        except ValueError:
            pass

    atendimentos = atendimento_repo.list_all(filters=filters)
    return [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%d/%m/%Y") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
            "has_laudo": a.has_laudo,
            "has_avaliacao": a.has_avaliacao,
        }
        for a in atendimentos
    ]
