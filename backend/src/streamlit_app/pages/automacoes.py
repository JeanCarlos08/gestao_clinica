"""Página: Automações com n8n."""

import streamlit as st

from core.config import settings
from services.n8n_service import n8n_service
from core.repositories.repositories import auditoria_repo
from components.cards import render_info_banner
from utils.helpers import format_datetime_br
from utils.logger import get_logger

logger = get_logger(__name__)


def render_automacoes() -> None:
    st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 8px; border-radius: 8px; font-size: 1.5rem;">⚡</div>
                    <h1 style="color: var(--text-primary); margin: 0; font-size: 1.75rem;">Automações</h1>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Integração com n8n Cloud e logs de eventos em tempo real</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Status da integração
    col_status, col_test = st.columns([3, 1])
    with col_status:
        if settings.has_n8n:
            st.success(f"✅ n8n configurado: `{settings.n8n_webhook_base_url}`")
        else:
            render_info_banner(
                "n8n não configurado. Defina N8N_WEBHOOK_BASE_URL no .env ou st.secrets.",
                type="warning", icon="⚠️",
            )
    with col_test:
        if st.button("🔌 Testar Conexão", use_container_width=True):
            ok, msg = n8n_service.test_connection()
            if ok:
                st.success(msg)
            else:
                st.error(msg)

    st.markdown("---")

    tab_triggers, tab_logs, tab_config = st.tabs([
        "⚡ Disparar Automações",
        "📋 Log de Eventos",
        "⚙️ Configuração",
    ])

    with tab_triggers:
        _render_triggers()

    with tab_logs:
        _render_logs()

    with tab_config:
        _render_config_info()


def _render_triggers() -> None:
    """Renderiza botões de disparo manual de automações."""
    st.markdown("### ⚡ Disparos Manuais de Automações")
    render_info_banner(
        "Esses disparos são normalmente automáticos. Use apenas para testes ou emergências.",
        type="info", icon="ℹ️",
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("**📊 Relatório Semanal**")
        st.caption("Dispara o workflow de relatório para o n8n.")
        if st.button("▶ Disparar Relatório", use_container_width=True, key="trig_report"):
            with st.spinner("Disparando..."):
                ok, msg = n8n_service.trigger_relatorio_semanal({"tipo": "manual", "origem": "painel"})
            if ok:
                st.success(f"✅ {msg}")
            else:
                st.error(f"❌ {msg}")

    with col2:
        st.markdown("**📱 Teste WhatsApp**")
        st.caption("Dispara um evento de atendimento de teste.")
        if st.button("▶ Disparar Teste", use_container_width=True, key="trig_wpp"):
            with st.spinner("Disparando..."):
                ok, msg = n8n_service.trigger(
                    "teste-conexao",
                    {"origem": "painel_automacoes", "tipo": "teste"},
                )
            if ok:
                st.success(f"✅ {msg}")
            else:
                st.warning(f"⚠️ {msg}")

    with col3:
        st.markdown("**🔔 Lembrete Manual**")
        st.caption("Dispara lembrete customizado.")
        atendimento_id_test = st.number_input("ID do Atendimento", min_value=1, value=1, key="lembrete_id")
        if st.button("▶ Enviar Lembrete", use_container_width=True, key="trig_lembrete"):
            with st.spinner("Disparando..."):
                ok, msg = n8n_service.trigger_lembrete(
                    atendimento_id=atendimento_id_test,
                    nome="Paciente Teste",
                    data_str="Amanhã",
                    hora_str="08:00",
                )
            if ok:
                st.success(f"✅ {msg}")
            else:
                st.error(f"❌ {msg}")

    # Disparo customizado
    st.markdown("---")
    st.markdown("### 🛠️ Disparo Customizado")
    with st.form("form_custom_trigger"):
        event_name = st.text_input("Nome do evento (endpoint)", placeholder="meu-evento-custom")
        payload_json = st.text_area(
            "Payload JSON",
            value='{"chave": "valor"}',
            height=100,
        )
        if st.form_submit_button("▶ Disparar", type="primary"):
            try:
                import json
                payload = json.loads(payload_json)
                ok, msg = n8n_service.trigger(event_name, payload)
                if ok:
                    st.success(f"✅ {msg}")
                else:
                    st.error(f"❌ {msg}")
            except Exception as e:
                st.error(f"❌ JSON inválido: {e}")


def _render_logs() -> None:
    """Renderiza log de auditoria/eventos."""
    st.markdown("### 📋 Log de Auditoria do Sistema")

    limit = st.slider("Últimos N registros", 10, 500, 50)
    entries = auditoria_repo.listar(limit=limit)

    if not entries:
        render_info_banner("Nenhum evento registrado ainda.", type="info")
        return

    for entry in entries:
        ts = format_datetime_br(entry.criado_em) if entry.criado_em else "-"
        action_colors = {
            "CREATE": "var(--status-green)", "UPDATE": "var(--accent-green)", "DELETE": "var(--status-red)",
            "STATUS": "var(--status-amber)", "ATTACH": "var(--metric-total)", "LOGIN": "var(--accent-green)",
        }
        color = action_colors.get(entry.acao, "var(--text-muted)")
        st.markdown(
            f"""<div style="
                background: var(--bg-card); border-radius: 8px; padding: 0.6rem 1rem;
                margin-bottom: 6px; border-left: 3px solid {color};
                font-size: 0.8rem;
            ">
                <span style="color: {color}; font-weight: 600;">[{entry.acao}]</span>
                <span style="color: var(--text-muted); margin-left: 8px;">{entry.entidade}</span>
                {f'<span style="color: var(--text-muted);">#{entry.entidade_id}</span>' if entry.entidade_id else ''}
                <span style="color: var(--text-primary); margin-left: 8px;">{entry.detalhes or ''}</span>
                <span style="color: var(--text-muted); float: right;">{ts}</span>
            </div>""",
            unsafe_allow_html=True,
        )


def _render_config_info() -> None:
    """Renderiza informações de configuração do n8n."""
    st.markdown("### ⚙️ Configuração n8n Cloud")
    st.markdown("""
    #### Como configurar

    **1. Acesse seu n8n Cloud:** `https://app.n8n.cloud`

    **2. Crie um workflow com Webhook Trigger:**
    - Node: **Webhook**
    - Method: `POST`
    - Authentication: `Header Auth` (opcional, use o campo `X-Webhook-Secret`)

    **3. Copie a URL do Webhook** e configure no `.env`:
    ```env
    N8N_WEBHOOK_BASE_URL=https://seu-workspace.app.n8n.cloud/webhook
    N8N_WEBHOOK_SECRET=seu_secret_aqui
    ```

    **4. Eventos disponíveis:**
    | Evento | Endpoint |
    |--------|----------|
    | Atendimento criado | `/webhook/atendimento-criado` |
    | Lembrete | `/webhook/lembrete-agendamento` |
    | Relatório semanal | `/webhook/relatorio-semanal` |
    | Status alterado | `/webhook/status-alterado` |
    | Teste | `/webhook/teste-conexao` |

    **5. No n8n, conecte ao WhatsApp** via Evolution API, Z-API ou Baileys.
    """)
