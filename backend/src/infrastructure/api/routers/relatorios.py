"""Relatórios router — report statistics and filtered atendimentos.

Provides detailed stats with optional date-range filtering and the
filtered atendimentos list used for report generation.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.repositories.repositories import AtendimentoRepository
from infrastructure.api.routers.deps import require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_atendimento_repo
from utils.cache import cache_get, cache_set
from utils.constants import PERM_VIEW_ATENDIMENTOS, TABLE_PACIENTES
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


@router.get("/relatorios/stats", tags=["Relatórios"])
async def get_relatorios_stats(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
):
    """
    Estatísticas detalhadas para relatórios, com filtro opcional por período.
    Usa SQL aggregation em vez de buscar todos os registros.
    Resultados são cacheados por 5 minutos (chave: período consultado).
    """
    cache_key = f"rel_stats:{data_inicio}:{data_fim}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    from datetime import date
    from infrastructure.connection import connection_scope
    from utils.constants import TABLE_ATENDIMENTOS

    conditions = []
    params = []

    if data_inicio:
        try:
            conditions.append("data >= %s")
            params.append(date.fromisoformat(data_inicio))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Data de início inválida: {data_inicio}. Use formato YYYY-MM-DD.")
    if data_fim:
        try:
            conditions.append("data <= %s")
            params.append(date.fromisoformat(data_fim))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Data de fim inválida: {data_fim}. Use formato YYYY-MM-DD.")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    try:
        def _run_relatorio():
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()

                # Query principal com todas as agregações
                cur.execute(f"""
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE status = 'Agendado') AS agendados,
                        COUNT(*) FILTER (WHERE status = 'Atendido') AS atendidos,
                        COUNT(*) FILTER (WHERE status = 'Concluído') AS concluidos,
                        COUNT(*) FILTER (WHERE status = 'Cancelado') AS cancelados
                    FROM {TABLE_ATENDIMENTOS}
                    {where_clause}
                """, params)
                totals = dict(cur.fetchone() or {})

                # Por status
                cur.execute(f"""
                    SELECT status, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    {where_clause}
                    GROUP BY status ORDER BY total DESC
                """, params)
                por_status = {r["status"]: r["total"] for r in cur.fetchall()}

                # Por modalidade
                cur.execute(f"""
                    SELECT modalidade, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    {where_clause}
                    GROUP BY modalidade ORDER BY total DESC
                """, params)
                por_modalidade = {r["modalidade"]: r["total"] for r in cur.fetchall()}

                # Por empresa (top 10)
                cur.execute(f"""
                    SELECT empresa, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    {where_clause}
                    GROUP BY empresa ORDER BY total DESC LIMIT 10
                """, params)
                por_empresa = {r["empresa"]: r["total"] for r in cur.fetchall()}

                # Por mês
                cur.execute(f"""
                    SELECT TO_CHAR(data, 'YYYY-MM') AS mes, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS}
                    {where_clause}
                    GROUP BY mes ORDER BY mes
                """, params)
                por_mes = {r["mes"]: r["total"] for r in cur.fetchall()}

                # Por paciente (top 10) via JOIN com pacientes
                cur.execute(f"""
                    SELECT COALESCE(p.nome, a.nome) AS paciente, COUNT(*) AS total
                    FROM {TABLE_ATENDIMENTOS} a
                    LEFT JOIN {TABLE_PACIENTES} p ON p.id = a.paciente_id
                    {where_clause}
                    GROUP BY paciente ORDER BY total DESC LIMIT 10
                """, params)
                por_paciente = {r["paciente"]: r["total"] for r in cur.fetchall()}

            return {
                "total": totals.get("total", 0),
                "por_status": por_status,
                "por_modalidade": por_modalidade,
                "por_empresa": por_empresa,
                "por_paciente": por_paciente,
                "por_mes": por_mes,
                "periodo": {
                    "data_inicio": data_inicio,
                    "data_fim": data_fim,
                },
            }

        result = await run_sync(_run_relatorio)
        cache_set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        logger.error(f"Erro ao calcular stats de relatórios: {e}")
        return {
            "total": 0,
            "por_status": {},
            "por_modalidade": {},
            "por_empresa": {},
            "por_paciente": {},
            "por_mes": {},
            "periodo": {"data_inicio": data_inicio, "data_fim": data_fim},
        }


@router.get("/relatorios/atendimentos", tags=["Relatórios"])
async def get_relatorios_atendimentos(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    modalidade: Optional[str] = None,
    current_user: dict = Depends(require_permission(PERM_VIEW_ATENDIMENTOS)),
    atendimento_repo: AtendimentoRepository = Depends(get_atendimento_repo),
):
    """Lista de atendimentos filtrada para geração de relatórios."""
    from datetime import date
    from core.entities.models import AtendimentoFilter

    filters = AtendimentoFilter(limit=5000, status=status, modalidade=modalidade)
    if data_inicio:
        try:
            filters.data_inicio = date.fromisoformat(data_inicio)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Data de início inválida: {data_inicio}. Use formato YYYY-MM-DD.")
    if data_fim:
        try:
            filters.data_fim = date.fromisoformat(data_fim)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Data de fim inválida: {data_fim}. Use formato YYYY-MM-DD.")

    atendimentos = await run_sync(atendimento_repo.list_all, filters=filters)
    return [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%d/%m/%Y") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
            "paciente_id": a.paciente_id,
            "has_laudo": a.has_laudo,
            "has_avaliacao": a.has_avaliacao,
        }
        for a in atendimentos
    ]
