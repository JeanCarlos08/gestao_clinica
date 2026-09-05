"""Dashboard router — unified dashboard + stats endpoints.

Provides the ``get_dashboard`` endpoint that returns stats and
recent atendimentos in a single round-trip, and the ``get_stats``
endpoint.
"""

from fastapi import APIRouter, Depends

from core.repositories.repositories import AtendimentoRepository
from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_atendimento_repo
from utils.constants import PERM_VIEW_DASHBOARD

router = APIRouter(prefix="/api")


@router.get("/dashboard", tags=["Dashboard"])
async def get_dashboard(
    current_user: dict = Depends(require_permission(PERM_VIEW_DASHBOARD)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    """Retorna stats + atendimentos recentes em uma única chamada."""
    from core.entities.models import AtendimentoFilter
    from core.repositories.repositories import paciente_repo, documento_repo
    from infrastructure.connection import connection_scope
    from utils.constants import TABLE_ATENDIMENTOS

    stats = await run_sync(atendimento_repo.get_stats)
    atendimentos = await run_sync(atendimento_repo.list_all, filters=AtendimentoFilter(limit=50))

    paciente_ids = {a.paciente_id for a in atendimentos if a.paciente_id}
    fotos_map: dict = {}
    if paciente_ids:
        for pid in paciente_ids:
            foto = await run_sync(paciente_repo.get_foto, pid)
            if foto:
                fotos_map[pid] = foto

    # Count documentos
    documentos = await run_sync(documento_repo.list_all)
    total_documentos = len(documentos)

    # Count avaliações (atendimentos com avaliacao_pdf)
    def _count_avaliacoes():
        try:
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                cur.execute(f"SELECT COUNT(*) FROM {TABLE_ATENDIMENTOS} WHERE avaliacao_pdf IS NOT NULL")
                row = cur.fetchone()
                return row[0] if row else 0
        except Exception:
            return 0

    total_avaliacoes = await run_sync(_count_avaliacoes)

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
            "total_documentos": total_documentos,
            "total_avaliacoes": total_avaliacoes,
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
                "paciente_id": a.paciente_id,
                "foto": fotos_map.get(a.paciente_id),
            }
            for a in atendimentos
        ],
    }


@router.get("/stats", tags=["Dashboard"])
async def get_stats(
    current_user: dict = Depends(require_permission(PERM_VIEW_DASHBOARD)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    """Estatísticas do dashboard (requer autenticação)."""
    return await run_sync(atendimento_repo.get_stats)
