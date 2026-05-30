"""
Componente: Formulários reutilizáveis.
"""

from datetime import date, time
from typing import Optional, Tuple

import streamlit as st

from utils.constants import MODALIDADES, STATUS_ATENDIMENTO
from utils.validators import validate_atendimento


def render_atendimento_form(
    key_prefix: str = "new",
    defaults: Optional[dict] = None,
    submit_label: str = "💾 Salvar",
) -> Tuple[bool, dict]:
    """
    Renderiza formulário de atendimento.

    Args:
        key_prefix: Prefixo único para evitar conflito de keys.
        defaults: Valores padrão para edição.
        submit_label: Texto do botão de submit.

    Returns:
        (submitted: bool, data: dict)
    """
    d = defaults or {}

    with st.form(f"form_atend_{key_prefix}"):
        col1, col2 = st.columns(2)
        with col1:
            empresa = st.text_input("Empresa *", value=d.get("empresa", ""),
                                    max_chars=255)
            nome = st.text_input("Paciente *", value=d.get("nome", ""),
                                 max_chars=255)
            modalidade = st.selectbox(
                "Modalidade *", MODALIDADES,
                index=MODALIDADES.index(d["modalidade"]) if d.get("modalidade") in MODALIDADES else 0,
            )
        with col2:
            data_v = st.date_input("Data *",
                                   value=d.get("data", date.today()),
                                   format="DD/MM/YYYY")
            hora_v = st.time_input("Hora *",
                                   value=d.get("hora", time(8, 0)),
                                   step=900)
            status = st.selectbox(
                "Status", STATUS_ATENDIMENTO,
                index=STATUS_ATENDIMENTO.index(d["status"]) if d.get("status") in STATUS_ATENDIMENTO else 0,
            )

        observacoes = st.text_area("Observações", value=d.get("observacoes", ""),
                                   height=100, max_chars=5000)

        submitted = st.form_submit_button(submit_label, type="primary",
                                          use_container_width=True)

    result = {
        "empresa": empresa if submitted else "",
        "nome": nome if submitted else "",
        "modalidade": modalidade if submitted else "",
        "data": data_v if submitted else None,
        "hora": hora_v if submitted else None,
        "status": status if submitted else "",
        "observacoes": observacoes if submitted else "",
    }

    if submitted:
        errors = validate_atendimento(
            result["empresa"], result["nome"], result["modalidade"],
            result["data"], result["hora"],
        )
        if errors:
            for e in errors:
                st.error(f"❌ {e}")
            return False, result

    return submitted, result


def render_filter_bar(key_prefix: str = "filter") -> dict:
    """
    Barra de filtros para lista de atendimentos.

    Returns:
        Dict com valores dos filtros.
    """
    with st.expander("🔍 Filtros", expanded=False):
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            empresa = st.text_input("Empresa", placeholder="Buscar...",
                                    key=f"{key_prefix}_empresa")
        with col2:
            nome = st.text_input("Paciente", placeholder="Buscar...",
                                 key=f"{key_prefix}_nome")
        with col3:
            modalidade = st.selectbox("Modalidade", ["Todos"] + MODALIDADES,
                                      key=f"{key_prefix}_modal")
        with col4:
            status = st.selectbox("Status", ["Todos"] + STATUS_ATENDIMENTO,
                                  key=f"{key_prefix}_status")

    return {
        "empresa": empresa or None,
        "nome": nome or None,
        "modalidade": modalidade if modalidade != "Todos" else None,
        "status": status if status != "Todos" else None,
    }
