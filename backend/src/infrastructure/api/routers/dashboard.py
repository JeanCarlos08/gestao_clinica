"""Dashboard router — unified dashboard + stats endpoints.

Provides the ``get_dashboard`` endpoint that returns stats and
recent atendimentos in a single round-trip, and the ``get_stats``
endpoint.
"""

from fastapi import APIRouter, Depends

from core.repositories.repositories import atendimento_repo, preferences_repo
from infrastructure.api.routers.deps import _slug_name, require_permission
from utils.constants import PERM_VIEW_DASHBOARD

router = APIRouter(prefix="/api")


@router.get("/dashboard", tags=["Dashboard"])
async def get_dashboard(current_user: dict = Depends(require_permission(PERM_VIEW_DASHBOARD))):
    """Retorna stats + atendimentos recentes em uma única chamada."""
    from core.entities.models import AtendimentoFilter

    stats = atendimento_repo.get_stats()
    atendimentos = atendimento_repo.list_all(filters=AtendimentoFilter(limit=50))

    # Busca fotos apenas para os atendimentos exibidos (não todas)
    nomes = {_slug_name(a.nome) for a in atendimentos}
    fotos: dict = {}
    if nomes:
        all_fotos = preferences_repo.get_many("patient_photo:")
        fotos = {k: v for k, v in all_fotos.items() if any(n in k for n in nomes)}

    return {
        "stats": {
            "total_atendimentos": stats.total_atendimentos,
            "total_pacientes": stats.total_pacientes,
            "agendados": stats.agendados,
            "atendidos": stats.atendidos,
            "concluidos": stats.concluidos,
            "cancelados": stats.cancelados,
            "total_empresas": stats.total_empresas,
            "atendimentos_hoje": stats.atendimentos_hoje,
            "atendimentos_mes": stats.atendimentos_mes,
            "por_modalidade": stats.por_modalidade,
            "por_empresa": stats.por_empresa,
        },
        "atendimentos": [
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
        ],
    }


@router.get("/stats", tags=["Dashboard"])
async def get_stats(current_user: dict = Depends(require_permission(PERM_VIEW_DASHBOARD))):
    """Estatísticas do dashboard (requer autenticação)."""
    return atendimento_repo.get_stats()
