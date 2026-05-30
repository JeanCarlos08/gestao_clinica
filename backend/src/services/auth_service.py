"""
Serviço de autenticação — mvpdepsicologia.

Suporta:
- Login por username/senha (hash SHA-256)
- Roles: admin, psicologo, recepcionista
- Verificação de permissões por rota
- Bootstrap do usuário admin inicial (1ª execução)
- Session state tipado com SessionUser

Arquitetura preparada para:
- Múltiplos usuários (apenas adicionar na tabela users)
- Permissões granulares por tela e ação
- Integração futura com OAuth / streamlit-authenticator
- JWT em deploys com API separada

Fluxo de login:
1. Busca usuário na tabela users pelo username
2. Compara senha (SHA-256 ou texto plano para dev)
3. Carrega SessionUser no st.session_state
4. Atualiza last_login
5. Registra auditoria
"""

import streamlit as st

from core.config import settings
from core.entities.user_models import SessionUser
from core.repositories.user_repositories import user_repo
from core.repositories.repositories import auditoria_repo
from utils.constants import (
    AUDIT_LOGIN, AUDIT_LOGOUT,
    SESSION_AUTHENTICATED, SESSION_USER_NAME, SESSION_CURRENT_PAGE,
    ROLE_ADMIN, ROLE_PERMISSIONS,
    PAGE_DASHBOARD,
)
from utils.helpers import hash_password, verify_password
from utils.logger import get_logger

logger = get_logger(__name__)

# Chave do session_state para o objeto SessionUser completo
SESSION_USER_KEY = "session_user"


# ─────────────────────────────────────────────────────────────
# Bootstrap — admin inicial
# ─────────────────────────────────────────────────────────────

def bootstrap_admin_if_needed() -> None:
    """
    Cria o usuário admin inicial caso não exista nenhum no banco.
    Chamado uma única vez no startup (app.py, via cache_resource).

    As credenciais vêm do .env:
    - APP_ADMIN_USER (padrão: admin)
    - APP_ADMIN_PASS (obrigatório)
    """
    admin_user = settings.auth_username
    admin_pass = settings.auth_password

    if not admin_pass:
        logger.warning("BOOTSTRAP: APP_ADMIN_PASS não configurado — admin não será criado.")
        return

    created = user_repo.bootstrap_admin(
        username=admin_user,
        display_name="Administrador",
        password_hash=hash_password(admin_pass),
    )
    if created:
        logger.info(f"BOOTSTRAP: Admin inicial '{admin_user}' criado com sucesso.")


# ─────────────────────────────────────────────────────────────
# Core Auth
# ─────────────────────────────────────────────────────────────

def is_authenticated() -> bool:
    """Retorna True se há um SessionUser válido na sessão."""
    return bool(
        st.session_state.get(SESSION_AUTHENTICATED, False)
        and st.session_state.get(SESSION_USER_KEY) is not None
    )


def get_session_user() -> SessionUser | None:
    """Retorna o SessionUser atual ou None se não autenticado."""
    return st.session_state.get(SESSION_USER_KEY)


def get_current_user() -> str:
    """Retorna o display_name do usuário logado ou 'Visitante'."""
    user = get_session_user()
    return user.display_name if user else "Visitante"


def has_permission(permission: str) -> bool:
    """
    Verifica se o usuário logado tem uma permissão específica.

    Uso:
        if has_permission(PERM_DELETE_ATENDIMENTO):
            # mostrar botão de excluir
    """
    user = get_session_user()
    if not user:
        return False
    return user.has_permission(permission)


def require_permission(permission: str) -> bool:
    """
    Bloqueia acesso se o usuário não tiver a permissão.
    Exibe mensagem de erro e retorna False.

    Uso:
        if not require_permission(PERM_MANAGE_CONFIGURACOES):
            return
    """
    if not has_permission(permission):
        st.error(
            f"🔒 Acesso negado. Você não tem permissão para realizar esta ação.\n"
            f"Role atual: **{get_session_user().role_label if get_session_user() else 'N/A'}**"
        )
        return False
    return True


def login(username: str, password: str) -> tuple[bool, str]:
    """
    Autentica o usuário.

    1. Busca na tabela users (modo multi-usuário)
    2. Fallback para .env (compatibilidade com MVP v1)

    Args:
        username: Nome de usuário.
        password: Senha em texto plano.

    Returns:
        (success: bool, message: str)
    """
    username = (username or "").strip()
    password = password or ""

    if not username or not password:
        return False, "Preencha usuário e senha."

    # ── Modo sem auth (desenvolvimento) ──────────────────────
    if not settings.auth_required:
        _create_dev_session(username)
        return True, "Acesso liberado (modo desenvolvimento)."

    # ── Autenticação via banco de dados (modo multi-usuário) ─
    user = user_repo.find_by_username(username)
    if user:
        stored_hash = user_repo.get_password_hash(username)
        if stored_hash and _verify_credentials(password, stored_hash):
            session_user = SessionUser.from_user(user)
            _set_session(session_user)
            user_repo.update_last_login(user.id)
            auditoria_repo.registrar(AUDIT_LOGIN, "auth", user.id, None, username)
            logger.info(f"AUTH: Login via banco — '{username}' (role={user.role})")
            return True, f"Bem-vindo(a), {user.display_name}! ✨"

    # ── Fallback: .env (compatibilidade MVP v1) ──────────────
    stored_user = settings.auth_username
    stored_pass = settings.auth_password
    if (
        stored_pass
        and username.lower() == stored_user.lower()
        and _verify_credentials(password, stored_pass)
    ):
        _create_env_session(username)
        logger.info(f"AUTH: Login via .env — '{username}'")
        return True, "Login realizado! (Usuário configurado via ambiente)"

    logger.warning(f"AUTH: Falha de login para '{username}'")
    return False, "Usuário ou senha incorretos."


def logout() -> None:
    """Encerra a sessão e registra auditoria."""
    user = get_session_user()
    username = user.username if user else "unknown"
    user_id = user.user_id if user else None
    auditoria_repo.registrar(AUDIT_LOGOUT, "auth", user_id, None, username)
    logger.info(f"AUTH: Logout de '{username}'")
    _clear_session()


# ─────────────────────────────────────────────────────────────
# Session helpers
# ─────────────────────────────────────────────────────────────

def _verify_credentials(password: str, stored: str) -> bool:
    """Verifica senha contra hash ou texto plano (dev)."""
    return password == stored or verify_password(password, stored)


def _set_session(session_user: SessionUser) -> None:
    st.session_state[SESSION_AUTHENTICATED] = True
    st.session_state[SESSION_USER_NAME] = session_user.display_name
    st.session_state[SESSION_USER_KEY] = session_user
    st.session_state.setdefault(SESSION_CURRENT_PAGE, PAGE_DASHBOARD)


def _create_dev_session(username: str) -> None:
    """Cria sessão de dev com permissões de admin."""
    from core.entities.user_models import SessionUser as SU
    session_user = SU(
        user_id=0, username=username,
        display_name=username, role=ROLE_ADMIN,
        permissions=ROLE_PERMISSIONS[ROLE_ADMIN],
    )
    _set_session(session_user)


def _create_env_session(username: str) -> None:
    """Cria sessão a partir das credenciais do .env (fallback MVP v1)."""
    from core.entities.user_models import SessionUser as SU
    session_user = SU(
        user_id=0, username=username,
        display_name="Administrador", role=ROLE_ADMIN,
        permissions=ROLE_PERMISSIONS[ROLE_ADMIN],
    )
    _set_session(session_user)


def _clear_session() -> None:
    keys = [SESSION_AUTHENTICATED, SESSION_USER_NAME, SESSION_USER_KEY, SESSION_CURRENT_PAGE]
    for k in keys:
        st.session_state.pop(k, None)


# ─────────────────────────────────────────────────────────────
# UI — Tela de Login
# ─────────────────────────────────────────────────────────────

def render_login_page() -> None:
    """Renderiza a página de login estilo 'Clínica IA'."""
    st.markdown("""
    <style>
    .stApp { background: var(--bg-primary); }
    [data-testid="stHeader"] { background: transparent !important; }
    </style>
    """, unsafe_allow_html=True)

    st.markdown("<br><br><br>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        # Card de login
        st.markdown("""
        <div style="
            text-align: center;
            margin-bottom: 2.5rem;
        ">
            <div style="
                background: var(--accent-green);
                width: 56px;
                height: 56px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000;
                font-size: 2rem;
                font-weight: bold;
                margin: 0 auto 1.5rem;
                box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
            ">✦</div>
            <h2 style="color: var(--text-primary); margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: -0.5px;">
                Clínica IA
            </h2>
            <p style="color: var(--text-muted); font-size: 1rem; margin: 0.75rem 0;">
                Gestão Clínica Inteligente e Estratégica
            </p>
        </div>
        """, unsafe_allow_html=True)

        with st.form("login_form", clear_on_submit=False):
            st.markdown("""
                <div style='
                    background: var(--bg-card); 
                    border: 1px solid var(--border-color); 
                    border-radius: 20px; 
                    padding: 2.5rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                '>
            """, unsafe_allow_html=True)
            
            username = st.text_input(
                "Usuário",
                placeholder="ex: juliana.fetosa",
                key="login_username",
            )
            password = st.text_input(
                "Senha",
                type="password",
                placeholder="••••••••",
                key="login_password",
            )
            
            st.markdown("<div style='margin-top: 2rem;'></div>", unsafe_allow_html=True)
            
            submitted = st.form_submit_button(
                "Entrar no Sistema",
                use_container_width=True,
                type="primary",
            )
            
            st.markdown("""
                <div style='text-align: center; margin-top: 1.5rem;'>
                    <a href='#' style='color: var(--text-muted); font-size: 0.8rem; text-decoration: none;'>Esqueceu sua senha?</a>
                </div>
            """, unsafe_allow_html=True)
            
            st.markdown("</div>", unsafe_allow_html=True)

            if submitted:
                if not username or not password:
                    st.error("⚠️ Preencha usuário e senha.")
                else:
                    with st.spinner("Autenticando..."):
                        success, message = login(username, password)
                    if success:
                        st.success(message)
                        st.rerun()
                    else:
                        st.error(f"❌ {message}")

    st.markdown(
        f"<p style='text-align:center;color: var(--text-muted);font-size:0.8rem;margin-top:5rem;'>"
        f"v{settings.app_version} · © 2025 Clínica IA<br>Sistema de Gestão Restrito e Auditado"
        f"</p>",
        unsafe_allow_html=True,
    )
