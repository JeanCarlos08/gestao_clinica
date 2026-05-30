"""
Componente Sidebar do sistema mvpdepsicologia.

Sidebar SaaS profissional com:
- Logo e branding
- Menu de navegação com ícones e destaque da página ativa
- Informações do usuário logado
- Botão de logout
- Versão do sistema e status da conexão

Completamente desacoplado das páginas — apenas modifica session_state.

Uso:
    from components.sidebar import render_sidebar
    render_sidebar()
"""

import streamlit as st

from core.config import settings
from services.auth_service import get_current_user, logout
from utils.constants import (
    SESSION_CURRENT_PAGE,
    PAGE_DASHBOARD,
    PAGES_CONFIG,
)
from utils.logger import get_logger

logger = get_logger(__name__)


def render_sidebar() -> str:
    """
    Renderiza a sidebar e retorna a página selecionada.

    Returns:
        Nome da página atual (string do SESSION_CURRENT_PAGE).
    """
    current_page = st.session_state.get(SESSION_CURRENT_PAGE, PAGE_DASHBOARD)

    with st.sidebar:
        # ── Logo / Branding ───────────────────────────────────
        st.markdown("""
        <div class="sidebar-logo">
          <span class="sidebar-logo-icon">✦</span>
          <span class="sidebar-logo-text">Clínica IA</span>
        </div>
        """, unsafe_allow_html=True)

        # ── Usuário Logado ────────────────────────────────────
        user_name = get_current_user()
        initials = "".join([n[0] for n in user_name.split()[:2]]).upper()
        st.markdown(
            f"""
            <div class="sidebar-user">
              <div class="sidebar-avatar">{initials}</div>
              <div>
                <div class="sidebar-username">{user_name}</div>
                <div class="sidebar-role">Administradora</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # ── Menu de Navegação ────────────────────────────────
        for page_key, page_config in PAGES_CONFIG.items():
            is_active = current_page == page_key
            icon = page_config["icon"]
            label = page_config["label"]
            
            active_class = "active" if is_active else ""
            
            # Usando st.button oculto para capturar o clique, mas renderizando com HTML customizado
            # Nota: Streamlit não permite botões dentro de st.markdown puro para mudar estado facilmente sem rerun
            # Então mantemos o st.button funcional, mas com estilo "invisível" sobreposto ou apenas o st.button formatado
            
            if st.button(
                f"{icon}  {label}",
                key=f"nav_{page_key}",
                use_container_width=True,
                type="secondary", # O CSS global vai cuidar de remover bordas se necessário
            ):
                st.session_state[SESSION_CURRENT_PAGE] = page_key
                logger.info(f"Navegação: {current_page} → {page_key}")
                st.rerun()

        # ── IA Assistente Card ────────────────────────────────
        st.markdown("""
            <div class="ia-box">
              <div class="ia-box-title">💬 IA Assistente</div>
              <div class="ia-box-sub">Pergunte sobre seus dados...</div>
            </div>
        """, unsafe_allow_html=True)

        # Botão de logout
        if st.button("🔴 Encerrar sessão", use_container_width=True, key="btn_logout"):
            logout()
            st.rerun()

        # ── Footer ────────────────────────────────────────────
        st.markdown(
            f"""
            <div style="
                margin-top: auto;
                padding: 1.5rem 1rem;
                color: var(--text-muted);
                font-size: 0.7rem;
            ">
                Clínica IA v{settings.app_version}<br>
                © 2025 · Todos os direitos reservados
            </div>
            """,
            unsafe_allow_html=True,
        )

    return current_page
