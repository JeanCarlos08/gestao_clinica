"""
Componente: Tabela de atendimentos reutilizável.
"""

from typing import List, Optional
import streamlit as st

from database.models import Atendimento
from utils.helpers import format_date_br, format_time_br
from components.cards import render_status_badge


def render_atendimentos_table(
    atendimentos: List[Atendimento],
    show_actions: bool = False,
    on_select_id: Optional[callable] = None,
) -> None:
    """
    Renderiza tabela de atendimentos com visual profissional.

    Args:
        atendimentos: Lista de Atendimento.
        show_actions: Se True, mostra botão de seleção.
        on_select_id: Callback quando um ID é selecionado.
    """
    if not atendimentos:
        st.markdown(
            "<div style='text-align:center;padding:2rem;color:#64748b;'>"
            "📋 Nenhum atendimento encontrado.</div>",
            unsafe_allow_html=True,
        )
        return

    # Cabeçalho
    header_cols = st.columns([1, 3, 3, 2, 2, 2])
    headers = ["ID", "Empresa", "Paciente", "Modalidade", "Data", "Status"]
    for col, h in zip(header_cols, headers):
        col.markdown(
            f"<span style='color:#94a3b8;font-size:0.7rem;font-weight:600;"
            f"text-transform:uppercase;letter-spacing:0.5px;'>{h}</span>",
            unsafe_allow_html=True,
        )

    st.markdown(
        "<hr style='border-color:#1e293b;margin:4px 0 8px;'>",
        unsafe_allow_html=True,
    )

    for a in atendimentos:
        cols = st.columns([1, 3, 3, 2, 2, 2])
        cols[0].markdown(f"<span style='color:#64748b;font-size:0.8rem;'>#{a.id}</span>",
                         unsafe_allow_html=True)
        cols[1].markdown(f"<span style='color:#e2e8f0;font-size:0.85rem;'>{a.empresa}</span>",
                         unsafe_allow_html=True)
        cols[2].markdown(f"<span style='color:#f1f5f9;font-size:0.85rem;font-weight:500;'>{a.nome}</span>",
                         unsafe_allow_html=True)
        cols[3].markdown(f"<span style='color:#94a3b8;font-size:0.8rem;'>{a.modalidade}</span>",
                         unsafe_allow_html=True)
        cols[4].markdown(
            f"<span style='color:#94a3b8;font-size:0.8rem;'>"
            f"{format_date_br(a.data)}</span>",
            unsafe_allow_html=True,
        )
        cols[5].markdown(render_status_badge(a.status), unsafe_allow_html=True)

        if show_actions and on_select_id:
            if st.button("Selecionar", key=f"sel_{a.id}", use_container_width=True):
                on_select_id(a.id)


def render_empty_state(
    message: str = "Nenhum dado encontrado.",
    icon: str = "📋",
    action_label: Optional[str] = None,
    action_key: Optional[str] = None,
) -> bool:
    """
    Renderiza estado vazio elegante.

    Returns:
        True se o botão de ação foi clicado.
    """
    st.markdown(
        f"""
        <div style="
            text-align: center;
            padding: 3rem 2rem;
            background: #1e293b;
            border-radius: 12px;
            border: 1px dashed #334155;
            margin: 1rem 0;
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">{icon}</div>
            <p style="color: #64748b; font-size: 0.9rem; margin: 0;">{message}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if action_label and action_key:
        col1, col2, col3 = st.columns([2, 1, 2])
        with col2:
            return st.button(action_label, key=action_key, type="primary",
                             use_container_width=True)
    return False
