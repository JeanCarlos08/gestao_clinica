"""
Página: Dashboard Principal.

Exibe métricas consolidadas, gráficos e insights de IA.
"""

import json

import streamlit as st

from components.cards import render_stats_row, render_info_banner
from core.repositories.repositories import atendimento_repo
from services.ai_service import ai_service
from utils.logger import get_logger

logger = get_logger(__name__)


@st.cache_data(ttl=300)
def _load_stats():
    """Carrega estatísticas do banco com cache de 5 minutos."""
    return atendimento_repo.get_stats()


@st.cache_data(ttl=300)
def _load_atendimentos_recentes():
    """Carrega últimos 10 atendimentos."""
    from core.entities.models import AtendimentoFilter
    return atendimento_repo.list_all(AtendimentoFilter(limit=10))


def render_dashboard() -> None:
    """Renderiza a página de Dashboard estilo 'Clínica IA'."""
    st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 8px; border-radius: 8px; font-size: 1.5rem;">📊</div>
                    <h1 style="color: var(--text-primary); margin: 0; font-size: 1.75rem;">Dashboard Executivo</h1>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Visão analítica e indicadores estratégicos em tempo real</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # ── Métricas ──────────────────────────────────────────────
    stats = _load_stats()
    render_stats_row(stats)
    st.markdown("<br>", unsafe_allow_html=True)

    # ── Gráficos ──────────────────────────────────────────────
    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown("#### 📋 Por Modalidade")
        if stats.por_modalidade:
            try:
                import pandas as pd
                df_mod = pd.DataFrame(
                    list(stats.por_modalidade.items()),
                    columns=["Modalidade", "Total"],
                ).sort_values("Total", ascending=False)
                st.bar_chart(df_mod.set_index("Modalidade"), color="#3B82F6")
            except Exception:
                for mod, total in stats.por_modalidade.items():
                    st.write(f"**{mod}:** {total}")
        else:
            render_info_banner("Nenhum dado de modalidade ainda.", type="info", icon="📊")

    with col_right:
        st.markdown("#### 🏢 Top Empresas")
        if stats.por_empresa:
            try:
                import pandas as pd
                df_emp = pd.DataFrame(
                    list(stats.por_empresa.items()),
                    columns=["Empresa", "Atendimentos"],
                ).sort_values("Atendimentos", ascending=False)
                st.bar_chart(df_emp.set_index("Empresa"), color="#8B5CF6")
            except Exception:
                for emp, total in stats.por_empresa.items():
                    st.write(f"**{emp}:** {total}")
        else:
            render_info_banner("Nenhuma empresa cadastrada ainda.", type="info", icon="🏢")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Atendimentos Recentes ─────────────────────────────────
    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown("#### 🕐 Últimos Atendimentos")
        recentes = _load_atendimentos_recentes()

        if recentes:
            from utils.helpers import format_date_br, format_time_br
            from components.cards import render_status_badge

            for a in recentes[:8]:
                badge = render_status_badge(a.status)
                st.markdown(
                    f"""
                    <div style="
                        background: var(--bg-card);
                        border-radius: 8px;
                        padding: 0.7rem 1rem;
                        margin-bottom: 6px;
                        border-left: 3px solid var(--border-color);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <span style="color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">{a.nome}</span>
                            <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 8px;">• {a.empresa}</span>
                            <br>
                            <span style="color: var(--text-muted); font-size: 0.75rem;">{a.modalidade} · {format_date_br(a.data)} {format_time_br(a.hora)}</span>
                        </div>
                        <div>{badge}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            render_info_banner(
                "Nenhum atendimento cadastrado ainda. Comece pela aba Atendimentos!",
                type="info", icon="📋",
            )

    with col2:
        # ── IA Insights ───────────────────────────────────────
        st.markdown("#### 🤖 IA Insights")

        if ai_service.is_available and stats.total_atendimentos > 0:
            with st.spinner("Gerando insights..."):
                stats_json = json.dumps({
                    "total": stats.total_atendimentos,
                    "agendados": stats.agendados,
                    "concluidos": stats.concluidos,
                    "cancelados": stats.cancelados,
                    "empresas": stats.total_empresas,
                    "modalidades": stats.por_modalidade,
                })
                insights = ai_service.generate_dashboard_insights(stats_json)

            st.markdown(
                f"<div style='background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;"
                f"padding: 1rem; font-size: 0.85rem; color: var(--text-primary); line-height: 1.6;'>{insights}</div>",
                unsafe_allow_html=True,
            )
        else:
            render_info_banner(
                "Configure GOOGLE_API_KEY para insights automáticos.",
                type="info", icon="🤖",
            )

        # ── Status do Sistema ─────────────────────────────────
        st.markdown("#### ⚙️ Status do Sistema")
        from infrastructure.connection import check_connection
        from core.config import settings

        db_ok = check_connection()
        st.markdown(
            f"🗄️ **Banco:** {'🟢 Conectado' if db_ok else '🔴 Desconectado'}<br>"
            f"🤖 **IA:** {'🟢 Ativa' if settings.has_ai else '🟡 Sem chave'}<br>"
            f"⚡ **n8n:** {'🟢 Configurado' if settings.has_n8n else '🟡 Sem URL'}<br>",
            unsafe_allow_html=True,
        )
