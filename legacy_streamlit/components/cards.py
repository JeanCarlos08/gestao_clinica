"""
Componente de Cards de métricas para o Dashboard.

Cards profissionais com gradientes, ícones e indicadores de tendência.

Uso:
    from components.cards import render_metric_card, render_stats_row
    render_stats_row(stats)
"""

import streamlit as st

from database.models import DashboardStats


def render_metric_card(
    title: str,
    value: int | str,
    icon: str = "",
    badge_class: str = "",
    color_var: str = "--text-primary",
    subtitle: str = "",
) -> None:
    """
    Renderiza um card de métrica estilo 'Clínica IA' (v2).
    """
    icon_html = f'<div class="metric-icon {badge_class}">{icon}</div>' if icon else ""
    
    st.markdown(
        f"""
        <div class="metric-card">
          {icon_html}
          <div class="metric-label">{title}</div>
          <div class="metric-value" style="color: var({color_var})">
            {value}
          </div>
          <div class="metric-sub">{subtitle}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_stats_row(stats: DashboardStats) -> None:
    """
    Renderiza a linha de cards de métricas estilo 'Clínica IA' (v2).
    """
    col1, col2, col3, col4 = st.columns(4)

    total = stats.total_atendimentos or 1 # evitar divisão por zero
    
    def get_pct(val):
        return round((val / total) * 100, 1)

    with col1:
        render_metric_card(
            title="Total de Atendimentos",
            value=f"{stats.total_atendimentos:,}".replace(",", "."),
            color_var="--metric-total",
            subtitle="+12.5% este mês"
        )
    with col2:
        render_metric_card(
            title="Concluídos",
            value=stats.concluidos,
            icon="✓",
            badge_class="metric-badge-green",
            color_var="--metric-done",
            subtitle=f"{get_pct(stats.concluidos)}% do total"
        )
    with col3:
        render_metric_card(
            title="Em Andamento",
            value=stats.agendados,
            icon="⏱",
            badge_class="metric-badge-amber",
            color_var="--metric-prog",
            subtitle=f"{get_pct(stats.agendados)}% do total"
        )
    with col4:
        pendentes = total - stats.concluidos - stats.agendados
        if pendentes < 0: pendentes = 0
        render_metric_card(
            title="Pendentes",
            value=pendentes,
            icon="⏱",
            badge_class="metric-badge-red",
            color_var="--metric-pend",
            subtitle=f"{get_pct(pendentes)}% do total"
        )


def render_status_badge(status: str) -> str:
    """
    Retorna HTML de badge colorido para o status usando variáveis CSS.
    """
    status_map = {
        "Concluído": ("--status-green", "--status-green-bg"),
        "Em Andamento": ("--status-amber", "--status-amber-bg"),
        "Pendente": ("--status-red", "--status-red-bg"),
    }
    
    color_var, bg_var = status_map.get(status, ("--text-muted", "--bg-card2"))

    return (
        f'<span style="'
        f'background: var({bg_var});'
        f'color: var({color_var});'
        f'padding: 4px 12px;'
        f'border-radius: 6px;'
        f'font-size: 0.75rem;'
        f'font-weight: 600;'
        f'">{status}</span>'
    )


def render_info_banner(
    message: str,
    type: str = "info",
    icon: str = "💡",
) -> None:
    """
    Renderiza um banner informativo customizado.

    Args:
        message: Texto da mensagem.
        type: 'info', 'success', 'warning', 'error'
        icon: Emoji do ícone.
    """
    colors = {
        "info":    ("#1d4ed8", "#1e3a5f"),
        "success": ("#10b981", "#064e3b"),
        "warning": ("#f59e0b", "#451a03"),
        "error":   ("#ef4444", "#450a0a"),
    }
    text_color, bg_color = colors.get(type, colors["info"])

    st.markdown(
        f"""
        <div style="
            background: {bg_color};
            border-left: 4px solid {text_color};
            border-radius: 6px;
            padding: 0.8rem 1rem;
            margin: 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 10px;
        ">
            <span style="font-size:1.2rem;">{icon}</span>
            <span style="color:#e2e8f0;font-size:0.88rem;">{message}</span>
        </div>
        """,
        unsafe_allow_html=True,
    )
