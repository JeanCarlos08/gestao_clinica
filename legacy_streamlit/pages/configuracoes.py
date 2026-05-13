"""
Página: Configurações — 7 seções completas.
"""

import base64
from datetime import datetime

import streamlit as st

from config import settings
from database.connection import check_connection, get_diagnostics
from database.repositories import preferences_repo, auditoria_repo
from database.user_repositories import clinic_config_repo, user_repo
from services.ai_service import ai_service
from services.n8n_service import n8n_service
from services.auth_service import get_session_user, has_permission
from components.cards import render_info_banner
from utils.constants import (
    CLINIC_PREF_NAME, CLINIC_PREF_PHONE, CLINIC_PREF_ADDRESS,
    CLINIC_PREF_EMAIL, CLINIC_PREF_THEME, CLINIC_PREF_LAYOUT,
    CLINIC_PREF_GOOGLE_DOC_ID, CLINIC_PREF_LOGO,
    CLINIC_PREF_USER_NAME, CLINIC_PREF_USER_EMAIL, CLINIC_PREF_USER_PHOTO,
    PERM_MANAGE_CONFIGURACOES, PERM_VIEW_LOGS, PERM_MANAGE_USERS,
    ALL_ROLES, ROLE_LABELS,
)
from utils.helpers import hash_password
from utils.logger import get_logger

logger = get_logger(__name__)


    st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 8px; border-radius: 8px; font-size: 1.5rem;">⚙️</div>
                    <h1 style="color: var(--text-primary); margin: 0; font-size: 1.75rem;">Configurações</h1>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Gestão completa do sistema e integrações</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "🏥 Clínica",
        "🎨 Sistema",
        "📄 Google Docs",
        "⚡ n8n",
        "📱 WhatsApp",
        "👤 Perfil",
        "🔧 Sistema / Logs",
    ])

    with tab1:
        _tab_clinica()
    with tab2:
        _tab_sistema()
    with tab3:
        _tab_google_docs()
    with tab4:
        _tab_n8n()
    with tab5:
        _tab_whatsapp()
    with tab6:
        _tab_perfil()
    with tab7:
        _tab_logs()


# ─────────────────────────────────────────────────────────────
# 1. Dados da Clínica
# ─────────────────────────────────────────────────────────────

def _tab_clinica() -> None:
    st.markdown("### 🏥 Dados da Clínica")

    cfg = clinic_config_repo.get_all_clinic_data()

    with st.form("form_clinica"):
        col1, col2 = st.columns(2)
        with col1:
            nome = st.text_input("Nome da Clínica *", value=cfg.get(CLINIC_PREF_NAME, ""))
            telefone = st.text_input("Telefone", value=cfg.get(CLINIC_PREF_PHONE, ""),
                                     placeholder="(11) 99999-9999")
            email = st.text_input("E-mail", value=cfg.get(CLINIC_PREF_EMAIL, ""),
                                  placeholder="contato@clinica.com.br")
        with col2:
            endereco = st.text_area("Endereço", value=cfg.get(CLINIC_PREF_ADDRESS, ""),
                                    height=100, placeholder="Rua, número, bairro, cidade - UF")

        # Logo upload
        st.markdown("**Logo da Clínica**")
        logo_upload = st.file_uploader("Enviar logo (PNG/JPG, máx 2MB)",
                                       type=["png", "jpg", "jpeg"], key="logo_up")
        logo_b64 = cfg.get(CLINIC_PREF_LOGO, "")
        if logo_b64:
            st.image(f"data:image/png;base64,{logo_b64}", width=200)

        if st.form_submit_button("💾 Salvar Dados da Clínica", type="primary"):
            if not nome:
                st.error("❌ Nome da clínica é obrigatório.")
            else:
                data = {
                    CLINIC_PREF_NAME: nome,
                    CLINIC_PREF_PHONE: telefone,
                    CLINIC_PREF_EMAIL: email,
                    CLINIC_PREF_ADDRESS: endereco,
                }
                if logo_upload:
                    content = logo_upload.read()
                    if len(content) <= 2 * 1024 * 1024:
                        data[CLINIC_PREF_LOGO] = base64.b64encode(content).decode()
                    else:
                        st.warning("⚠️ Logo maior que 2MB ignorada.")

                clinic_config_repo.save_clinic_data(data)
                st.success("✅ Dados da clínica salvos!")
                st.rerun()


# ─────────────────────────────────────────────────────────────
# 2. Configurações do Sistema
# ─────────────────────────────────────────────────────────────

def _tab_sistema() -> None:
    st.markdown("### 🎨 Configurações do Sistema")

    cfg = clinic_config_repo.get_all_clinic_data()

    with st.form("form_sistema"):
        col1, col2 = st.columns(2)
        with col1:
            tema = st.selectbox("Tema", ["dark", "light"],
                                index=0 if cfg.get(CLINIC_PREF_THEME, "dark") == "dark" else 1)
        with col2:
            layout = st.selectbox("Largura do Layout",
                                  ["wide", "centered"],
                                  index=0 if cfg.get(CLINIC_PREF_LAYOUT, "wide") == "wide" else 1)

        st.markdown("**Dashboard**")
        show_ai_insights = st.checkbox(
            "Mostrar insights de IA no dashboard",
            value=preferences_repo.get("dash_ai_insights", "true") == "true"
        )
        show_recent = st.checkbox(
            "Mostrar últimos atendimentos no dashboard",
            value=preferences_repo.get("dash_recent", "true") == "true"
        )

        if st.form_submit_button("💾 Salvar Configurações", type="primary"):
            clinic_config_repo.save_clinic_data({
                CLINIC_PREF_THEME: tema,
                CLINIC_PREF_LAYOUT: layout,
            })
            preferences_repo.save("dash_ai_insights", "true" if show_ai_insights else "false")
            preferences_repo.save("dash_recent", "true" if show_recent else "false")
            st.success("✅ Configurações salvas! Reinicie para aplicar o tema.")

    # Informações do sistema
    st.markdown("---")
    st.markdown("#### ℹ️ Informações do Sistema")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Versão", settings.app_version)
    with col2:
        st.metric("Ambiente", settings.app_env.upper())
    with col3:
        st.metric("Backend BD", "PostgreSQL")


# ─────────────────────────────────────────────────────────────
# 3. Google Docs
# ─────────────────────────────────────────────────────────────

def _tab_google_docs() -> None:
    st.markdown("### 📄 Configurações Google Docs")

    cfg = clinic_config_repo.get_all_clinic_data()
    current_doc_id = cfg.get(CLINIC_PREF_GOOGLE_DOC_ID, "")

    render_info_banner(
        "Fase 1: Google Docs público embedado via iframe. "
        "Fase 2 (futuro): API completa para geração automática de laudos.",
        type="info", icon="📄",
    )

    with st.form("form_gdocs"):
        doc_url = st.text_input(
            "URL ou ID do Google Doc Principal",
            value=current_doc_id,
            placeholder="https://docs.google.com/document/d/SEU_DOC_ID/edit",
            help="Cole o link de compartilhamento do Google Docs",
        )
        permissao = st.selectbox(
            "Permissão do documento",
            ["Qualquer pessoa com o link pode ver",
             "Restrito (login Google obrigatório)",
             "Público na web"],
        )
        st.markdown("**Preview** (apenas documentos públicos)")
        show_preview = st.checkbox("Mostrar preview do documento abaixo", value=bool(current_doc_id))

        if st.form_submit_button("💾 Salvar Configurações Google Docs", type="primary"):
            from services.google_docs_service import google_docs_service
            doc_id = google_docs_service.extract_id_from_url(doc_url) if doc_url else ""
            if doc_url and not doc_id:
                st.error("❌ URL inválida. Use uma URL do Google Docs.")
            else:
                clinic_config_repo.save(CLINIC_PREF_GOOGLE_DOC_ID, doc_id or "")
                preferences_repo.save("gdocs_permissao", permissao)
                st.success("✅ Configurações do Google Docs salvas!")
                st.rerun()

    # Preview
    if show_preview and current_doc_id:
        st.markdown("---")
        st.markdown("#### 🔍 Preview do Documento")
        from services.google_docs_service import google_docs_service
        google_docs_service.render_embedded(current_doc_id, height=500)

    # Roadmap
    with st.expander("🗺️ Roadmap de Integração Google Docs"):
        st.markdown("""
        | Fase | Status | Funcionalidade |
        |------|--------|----------------|
        | **1** | ✅ **Atual** | Embed via iframe — visualização simples |
        | **2** | 🔜 Futuro | Google Docs API — preenchimento automático |
        | **2** | 🔜 Futuro | Templates de laudo com dados do paciente |
        | **2** | 🔜 Futuro | Exportação PDF automática via API |
        | **3** | 🔜 Futuro | Envio automático via WhatsApp/n8n |
        """)


# ─────────────────────────────────────────────────────────────
# 4. n8n
# ─────────────────────────────────────────────────────────────

def _tab_n8n() -> None:
    st.markdown("### ⚡ Configurações n8n")

    # Status
    if settings.has_n8n:
        st.success(f"✅ n8n configurado: `{settings.n8n_webhook_base_url}`")
    else:
        render_info_banner(
            "Configure N8N_WEBHOOK_BASE_URL no arquivo .env para ativar automações.",
            type="warning", icon="⚠️",
        )

    with st.form("form_n8n"):
        webhook_url = st.text_input(
            "Webhook Base URL",
            value=settings.n8n_webhook_base_url or "",
            placeholder="https://seu-workspace.app.n8n.cloud/webhook",
        )
        webhook_secret = st.text_input(
            "Secret (X-Webhook-Secret)",
            type="password",
            placeholder="Deixe em branco se não usar autenticação",
        )
        st.caption("💡 Configure também no arquivo `.env`: `N8N_WEBHOOK_BASE_URL` e `N8N_WEBHOOK_SECRET`")

        if st.form_submit_button("💾 Salvar em Preferências", type="primary"):
            clinic_config_repo.save("n8n_webhook_url_custom", webhook_url)
            st.success("✅ URL salva nas preferências. Para produção, use o .env.")

    # Teste de conexão
    st.markdown("---")
    st.markdown("#### 🔌 Teste de Conexão")
    col1, col2 = st.columns([1, 3])
    with col1:
        if st.button("▶ Testar Agora", type="primary", use_container_width=True):
            with st.spinner("Testando..."):
                ok, msg = n8n_service.test_connection()
            if ok:
                st.success(f"✅ {msg}")
            else:
                st.error(f"❌ {msg}")

    # Eventos disponíveis
    with st.expander("📋 Eventos de Webhook Disponíveis"):
        st.markdown("""
        | Evento | Endpoint | Trigger |
        |--------|----------|---------|
        | Atendimento criado | `/atendimento-criado` | Novo cadastro |
        | Lembrete | `/lembrete-agendamento` | D-1 do agendamento |
        | Status alterado | `/status-alterado` | Mudança de status |
        | Relatório semanal | `/relatorio-semanal` | Agendado |
        | Teste | `/teste-conexao` | Manual |
        """)


# ─────────────────────────────────────────────────────────────
# 5. WhatsApp (estrutura futura)
# ─────────────────────────────────────────────────────────────

def _tab_whatsapp() -> None:
    st.markdown("### 📱 WhatsApp")

    render_info_banner(
        "Fase 1 (atual): Links wa.me — sem API, funciona imediatamente. "
        "Fase 2 (futuro): Evolution API para envio programático.",
        type="info", icon="📱",
    )

    # Status atual
    st.markdown("#### ✅ Fase 1 — Ativa (Links wa.me)")
    st.markdown("""
    A Fase 1 está **ativa e funcional**:
    - Links diretos para abrir o WhatsApp já são gerados na tela de Atendimentos
    - Mensagens pré-formatadas de confirmação e lembrete
    - Funciona sem API Key, sem custo adicional
    """)

    st.markdown("---")
    st.markdown("#### 🔜 Fase 2 — Evolution API (Futuro)")

    with st.form("form_wpp_futuro"):
        col1, col2 = st.columns(2)
        with col1:
            api_url = st.text_input("API URL (Evolution/Z-API)",
                                    placeholder="https://api.evolution.com",
                                    disabled=True)
            api_token = st.text_input("API Token", type="password",
                                      placeholder="Disponível na Fase 2",
                                      disabled=True)
        with col2:
            numero = st.text_input("Número WhatsApp Business",
                                   placeholder="5511999998888",
                                   disabled=True)
            st.markdown("**Status:** 🔜 Fase 2")

        st.form_submit_button("💾 Salvar (Fase 2)", disabled=True)

    st.caption("🔒 Configuração bloqueada até implementação da Fase 2.")


# ─────────────────────────────────────────────────────────────
# 6. Perfil do Usuário
# ─────────────────────────────────────────────────────────────

def _tab_perfil() -> None:
    st.markdown("### 👤 Perfil do Usuário")

    session_user = get_session_user()
    if not session_user:
        st.error("Sessão inválida.")
        return

    # Info atual
    col_avatar, col_info = st.columns([1, 3])
    with col_avatar:
        if session_user.photo_base64:
            st.image(f"data:image/png;base64,{session_user.photo_base64}", width=100)
        else:
            st.markdown(
                f"""<div style="
                    background: var(--bg-card2);
                    border-radius: 50%;
                    width: 80px;
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--accent-green);
                    border: 1px solid var(--border-color);
                ">{session_user.display_name[0].upper()}</div>""",
                unsafe_allow_html=True,
            )
    with col_info:
        st.markdown(f"**Nome:** {session_user.display_name}")
        st.markdown(f"**Usuário:** `{session_user.username}`")
        st.markdown(f"**Role:** {session_user.role_icon} {session_user.role_label}")
        st.markdown(f"**E-mail:** {session_user.email or 'Não informado'}")

    st.markdown("---")
    st.markdown("#### ✏️ Editar Perfil")

    with st.form("form_perfil"):
        display_name = st.text_input("Nome de Exibição", value=session_user.display_name)
        email = st.text_input("E-mail", value=session_user.email or "",
                              placeholder="seu@email.com")
        foto_upload = st.file_uploader("Foto de Perfil (PNG/JPG, máx 1MB)",
                                       type=["png", "jpg", "jpeg"])

        st.markdown("**Alterar Senha** *(deixe em branco para manter atual)*")
        col1, col2 = st.columns(2)
        with col1:
            nova_senha = st.text_input("Nova Senha", type="password")
        with col2:
            confirmar = st.text_input("Confirmar Senha", type="password")

        if st.form_submit_button("💾 Salvar Perfil", type="primary"):
            from database.user_models import UserUpdate
            update = UserUpdate(
                display_name=display_name if display_name else None,
                email=email if email else None,
            )
            if foto_upload:
                content = foto_upload.read()
                if len(content) <= 1024 * 1024:
                    update.photo_base64 = base64.b64encode(content).decode()
                else:
                    st.warning("⚠️ Foto maior que 1MB ignorada.")

            if nova_senha:
                if nova_senha != confirmar:
                    st.error("❌ As senhas não coincidem.")
                    return
                if len(nova_senha) < 6:
                    st.error("❌ Senha deve ter pelo menos 6 caracteres.")
                    return
                update.password_hash = hash_password(nova_senha)

            if session_user.user_id > 0:
                ok = user_repo.update(session_user.user_id, update)
                if ok:
                    st.success("✅ Perfil atualizado! Faça login novamente para ver as alterações.")
                else:
                    st.error("❌ Erro ao atualizar. Tente novamente.")
            else:
                # Usuário via .env — salva em preferências
                clinic_config_repo.save(CLINIC_PREF_USER_NAME, display_name)
                clinic_config_repo.save(CLINIC_PREF_USER_EMAIL, email)
                st.success("✅ Preferências salvas!")

    # Gestão de usuários (apenas admin)
    if has_permission(PERM_MANAGE_USERS):
        st.markdown("---")
        _render_gestao_usuarios()


def _render_gestao_usuarios() -> None:
    """Gestão de usuários — visível apenas para admin."""
    st.markdown("#### 👥 Gestão de Usuários *(Admin)*")

    users = user_repo.list_all()
    if users:
        for u in users:
            with st.expander(f"{u.role_icon} {u.display_name} ({u.username}) — {u.role_label}"):
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.markdown(f"**E-mail:** {u.email or 'N/A'}")
                    st.markdown(f"**Status:** {'✅ Ativo' if u.is_active else '❌ Inativo'}")
                    if u.last_login:
                        st.markdown(f"**Último login:** {u.last_login.strftime('%d/%m/%Y %H:%M')}")
                with col2:
                    if u.is_active:
                        if st.button("🚫 Desativar", key=f"deact_{u.id}"):
                            user_repo.deactivate(u.id)
                            st.success("Usuário desativado.")
                            st.rerun()

    st.markdown("**➕ Novo Usuário**")
    with st.form("form_novo_user"):
        col1, col2, col3 = st.columns(3)
        with col1:
            nu_username = st.text_input("Username")
            nu_nome = st.text_input("Nome de exibição")
        with col2:
            nu_email = st.text_input("E-mail")
            nu_role = st.selectbox("Role", ALL_ROLES, format_func=lambda r: ROLE_LABELS[r])
        with col3:
            nu_senha = st.text_input("Senha inicial", type="password")

        if st.form_submit_button("➕ Criar Usuário", type="primary"):
            if not nu_username or not nu_nome or not nu_senha:
                st.error("❌ Username, nome e senha são obrigatórios.")
            elif user_repo.username_exists(nu_username):
                st.error(f"❌ Username '{nu_username}' já existe.")
            else:
                from database.user_models import UserCreate
                new_id = user_repo.create(UserCreate(
                    username=nu_username,
                    display_name=nu_nome,
                    password_hash=hash_password(nu_senha),
                    role=nu_role,
                    email=nu_email or None,
                ))
                if new_id:
                    st.success(f"✅ Usuário '{nu_username}' criado (ID #{new_id})!")
                    st.rerun()
                else:
                    st.error("❌ Erro ao criar usuário.")


# ─────────────────────────────────────────────────────────────
# 7. Logs e Sistema
# ─────────────────────────────────────────────────────────────

def _tab_logs() -> None:
    st.markdown("### 🔧 Diagnóstico e Logs do Sistema")

    # Status das integrações
    col1, col2, col3, col4 = st.columns(4)
    db_ok = check_connection()
    with col1:
        st.metric("🗄️ Banco", "✅ OK" if db_ok else "❌ Erro")
    with col2:
        st.metric("🤖 IA Gemini", "✅ Ativa" if settings.has_ai else "⚠️ Sem chave")
    with col3:
        st.metric("⚡ n8n", "✅ Config" if settings.has_n8n else "⚠️ Sem URL")
    with col4:
        st.metric("📱 WhatsApp", "✅ Fase 1")

    # Testes de conectividade
    st.markdown("---")
    st.markdown("#### 🧪 Testes de Conectividade")
    col_a, col_b, col_c = st.columns(3)
    with col_a:
        if st.button("🗄️ Testar Banco", use_container_width=True):
            st.success("✅ Banco OK!") if check_connection() else st.error("❌ Falha.")
    with col_b:
        if st.button("🤖 Testar IA", use_container_width=True):
            if settings.has_ai:
                r = ai_service.generate_dashboard_insights('{"total":1}')
                if "Não foi possível" not in r:
                    st.success("✅ Gemini OK!")
                else:
                    st.error("❌ Gemini com falha.")
            else:
                st.warning("⚠️ GOOGLE_API_KEY não configurada.")
    with col_c:
        if st.button("⚡ Testar n8n", use_container_width=True):
            ok, msg = n8n_service.test_connection()
            st.success(f"✅ {msg}") if ok else st.error(f"❌ {msg}")

    # Diagnóstico do banco
    st.markdown("---")
    st.markdown("#### 🗄️ Diagnóstico do Banco")
    diag = get_diagnostics()
    for k, v in diag.items():
        st.markdown(f"**{k.capitalize()}:** `{v}`")

    # Log de auditoria
    st.markdown("---")
    st.markdown("#### 📋 Log de Auditoria")
    limit = st.slider("Últimos N registros", 10, 200, 50, key="log_limit")
    entries = auditoria_repo.listar(limit=limit)

    action_colors = {
        "CREATE": "#10b981", "UPDATE": "#3b82f6", "DELETE": "#ef4444",
        "STATUS": "#f59e0b", "ATTACH": "#8b5cf6", "LOGIN": "#06b6d4",
        "LOGOUT": "#64748b",
    }

    if not entries:
        render_info_banner("Nenhum evento registrado ainda.", type="info")
    else:
        for e in entries:
            ts = e.criado_em.strftime("%d/%m/%Y %H:%M") if e.criado_em else "-"
            color = action_colors.get(e.acao, "var(--text-muted)")
            st.markdown(
                f"""<div style="background: var(--bg-card); border-radius: 8px; padding: 0.6rem 1rem;
                margin-bottom: 6px; border-left: 3px solid {color}; font-size: 0.8rem;">
                <span style="color: {color}; font-weight: 600;">[{e.acao}]</span>
                <span style="color: var(--text-muted); margin-left: 6px;">{e.entidade}</span>
                {f'<span style="color: var(--text-muted);">#{e.entidade_id}</span>' if e.entidade_id else ''}
                <span style="color: var(--text-primary); margin-left: 8px;">{e.detalhes or ''}</span>
                <span style="color: var(--text-muted); float: right;">{ts} · {e.usuario or ''}</span>
                </div>""",
                unsafe_allow_html=True,
            )

    # Backup
    st.markdown("---")
    st.markdown("#### 💾 Backup de Dados")
    if st.button("📥 Gerar Backup JSON", type="secondary"):
        try:
            import json
            from database.connection import connection_scope
            backup: dict = {"timestamp": datetime.now().isoformat(),
                            "version": settings.app_version, "tables": {}}
            with connection_scope(commit=False) as conn:
                cur = conn.cursor()
                for tbl in ["atendimentos", "auditoria", "user_preferences", "documentos"]:
                    try:
                        cur.execute(f"SELECT * FROM {tbl}")
                        backup["tables"][tbl] = [dict(r) for r in cur.fetchall()]
                    except Exception:
                        backup["tables"][tbl] = []
            data = json.dumps(backup, default=str, indent=2).encode("utf-8")
            st.download_button("⬇️ Baixar Backup",
                               data=data,
                               file_name=f"backup_{datetime.now():%Y%m%d_%H%M%S}.json",
                               mime="application/json")
        except Exception as ex:
            st.error(f"❌ Erro ao gerar backup: {ex}")
