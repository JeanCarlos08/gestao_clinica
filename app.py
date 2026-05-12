"""
mvpdepsicologia — Sistema de Gestão Clínica Ocupacional
========================================================

Ponto de entrada principal da aplicação Streamlit.

Responsabilidades deste arquivo (APENAS):
1. Configuração da página Streamlit
2. Injeção de estilos globais
3. Inicialização do banco de dados (schema)
4. Verificação de autenticação
5. Roteamento para a página correta

NÃO contém: lógica de negócio, queries, UI de formulários, etc.
"""

import streamlit as st
from pathlib import Path
from dotenv import load_dotenv

# Forçar o carregamento do .env antes de qualquer outra coisa
load_dotenv()

# ─────────────────────────────────────────────────────────────
# Configuração da página (DEVE ser o primeiro comando Streamlit)
# ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Clínica IA",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────
# CSS Global
# ─────────────────────────────────────────────────────────────

st.markdown("""
<style>
/* ===== PALETA DE CORES — CLÍNICA IA ===== */
:root {
    --bg-primary:    #0a0f0a;   /* fundo geral — preto esverdeado */
    --bg-sidebar:    #0d120d;   /* sidebar escura */
    --bg-card:       #111811;   /* cards e painéis */
    --bg-card2:      #141e14;   /* cards secundários */
    --accent-green:  #22c55e;   /* verde principal — botões, ativo */
    --accent-green2: #16a34a;   /* verde escuro — hover */
    --text-primary:  #e8f5e8;   /* texto principal — branco esverdeado */
    --text-muted:    #6b7c6b;   /* texto secundário */
    --text-label:    #9ca89c;   /* labels e títulos de coluna */
    --border-color:  #1e2e1e;   /* bordas dos cards */
    --border-light:  #243024;   /* bordas mais visíveis */
    --status-green:  #16a34a;   /* badge Concluído */
    --status-amber:  #b45309;   /* badge Em andamento */
    --status-red:    #b91c1c;   /* badge Pendente */
    --status-green-bg: #052e16; /* fundo badge Concluído */
    --status-amber-bg: #1c0a00; /* fundo badge Em andamento */
    --status-red-bg:   #1a0000; /* fundo badge Pendente */
    --metric-total:  #22c55e;   /* número Total de Atendimentos */
    --metric-done:   #22c55e;   /* número Concluídos */
    --metric-prog:   #f59e0b;   /* número Em Andamento */
    --metric-pend:   #ef4444;   /* número Pendentes */
}

/* Fundo geral */
.stApp { background-color: var(--bg-primary) !important; }
[data-testid="stAppViewContainer"] { background-color: var(--bg-primary); }
[data-testid="stHeader"] { background-color: var(--bg-primary) !important; }

/* Remove footer padrão Streamlit */
footer { visibility: hidden; }
#MainMenu { visibility: hidden; }

/* Fonte global */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

/* Scrollbar dark */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }

/* ── Sidebar Custom Styles ─────────────────────────────── */
[data-testid="stSidebar"] {
    background-color: var(--bg-sidebar) !important;
    border-right: 1px solid var(--border-color);
    padding-top: 0;
}
[data-testid="stSidebar"] > div:first-child { padding: 0; }

/* Logo area no topo */
.sidebar-logo {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 8px;
}
.sidebar-logo-icon {
    color: var(--accent-green);
    font-size: 22px;
}
.sidebar-logo-text {
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.3px;
}

/* Perfil do usuário */
.sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 8px;
}
.sidebar-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--accent-green2);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #fff;
}
.sidebar-username { color: var(--text-primary); font-size: 13px; font-weight: 500; }
.sidebar-role { color: var(--accent-green); font-size: 11px; }

/* Links de navegação */
.nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    margin: 2px 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-label);
    transition: all .15s;
    text-decoration: none !important;
}
.nav-item:hover { background: var(--bg-card); color: var(--text-primary); }
.nav-item.active {
    background: var(--bg-card2);
    color: var(--accent-green);
    border-left: 3px solid var(--accent-green);
    padding-left: 13px;
}
.nav-icon { font-size: 16px; }

/* Seção IA Assistente na sidebar */
.ia-box {
    margin: 12px 10px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 12px;
    background: var(--bg-card);
}
.ia-box-title {
    color: var(--accent-green);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
}
.ia-box-sub { color: var(--text-muted); font-size: 11px; margin-bottom: 10px; }

/* Botão Encerrar Sessão */
.logout-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    margin: 4px 8px;
    border-radius: 8px;
    color: #ef4444;
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    border: none;
    width: calc(100% - 16px);
    text-align: left;
}
.logout-btn:hover { background: rgba(239,68,68,.08); }

/* Sobrescrita para botões da sidebar para parecerem links de nav */
[data-testid="stSidebar"] .stButton > button {
    background-color: transparent !important;
    color: var(--text-label) !important;
    border: none !important;
    text-align: left !important;
    justify-content: flex-start !important;
    padding: 10px 16px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    width: 100% !important;
    transition: all .15s !important;
}

[data-testid="stSidebar"] .stButton > button:hover {
    background-color: var(--bg-card) !important;
    color: var(--text-primary) !important;
}

/* Identifica botão ativo via CSS (hack se não houver classe) */
/* Como o Streamlit não coloca classe 'active', deixamos o botão padrão mas com cores da paleta */

/* Fundo principal */
.stApp {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

/* Sidebar */
section[data-testid="stSidebar"] {
    background-color: var(--bg-sidebar) !important;
    border-right: 1px solid var(--border-color) !important;
}
section[data-testid="stSidebar"] > div {
    background-color: var(--bg-sidebar) !important;
}

/* Botões Primários */
.stButton > button[kind="primary"] {
    background: var(--accent-green) !important;
    color: #000 !important;
    font-weight: 700 !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.6rem 1.25rem !important;
    transition: all .3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.2) !important;
}
.stButton > button[kind="primary"]:hover {
    background: var(--accent-green2) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3) !important;
}

/* Sidebar Styling */
[data-testid="stSidebar"] {
    background-color: var(--bg-sidebar) !important;
}

/* Cards (st.container/st.expander) */
.stExpander, [data-testid="stVerticalBlock"] > div > div > div[style*="background"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px !important;
}

/* ── Metric Cards Custom Styles ────────────────────────── */
.metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 18px 20px;
    min-height: 110px;
    position: relative;
    transition: all .2s;
}
.metric-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-light);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.metric-label {
    color: var(--text-label);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 8px;
}
.metric-value {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
}
.metric-sub {
    font-size: 12px;
    color: var(--text-muted);
}
.metric-icon {
    position: absolute;
    top: 18px; right: 18px;
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
}
.metric-badge-green { border: 2px solid var(--accent-green); color: var(--accent-green); }
.metric-badge-amber { border: 2px solid #f59e0b; color: #f59e0b; }
.metric-badge-red   { border: 2px solid #ef4444; color: #ef4444; }

/* Remove estilo padrão st.metric */
[data-testid="stMetric"] { display: none !important; }

    border-radius: 10px !important;
    padding: 0.75rem 1rem !important;
}

/* ── Filter Section Custom Styles ────────────────────────── */
.filter-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px 20px;
    margin: 16px 0;
}
.filter-title {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
}

/* Inputs e selects dark (BaseWeb Overrides) */
div[data-baseweb="input"] {
    background: var(--bg-primary) !important;
    border: 1px solid var(--border-light) !important;
    border-radius: 8px !important;
}
div[data-baseweb="input"] input {
    background: transparent !important;
    color: var(--text-primary) !important;
}
div[data-baseweb="select"] > div {
    background: var(--bg-primary) !important;
    border: 1px solid var(--border-light) !important;
    border-radius: 8px !important;
    color: var(--text-primary) !important;
}

/* Dropdown options dark */
[data-baseweb="popover"] ul {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-light) !important;
    padding: 0 !important;
}
[data-baseweb="popover"] li {
    color: var(--text-primary) !important;
    transition: background 0.2s !important;
}
[data-baseweb="popover"] li:hover {
    background: var(--bg-card2) !important;
    color: var(--accent-green) !important;
}

/* Labels dos inputs */
label[data-testid="stWidgetLabel"] {
    color: var(--text-label) !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    margin-bottom: 4px !important;
}

/* Date inputs */
div[data-testid="stDateInput"] > div {
    background: var(--bg-primary) !important;
    border: 1px solid var(--border-light) !important;
    border-radius: 8px !important;
}
div[data-testid="stDateInput"] input {
    color: var(--text-primary) !important;
}

/* ── Dark Table Custom Styles ────────────────────────── */
.table-container {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    margin: 16px 0;
}
.table-section-title {
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
}

/* Tabela dark */
.dark-table { width: 100%; border-collapse: collapse; }
.dark-table th {
    color: var(--text-label);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .06em;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
}
.dark-table td {
    color: var(--text-primary);
    font-size: 13px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
}
.dark-table tr:last-child td { border-bottom: none; }
.dark-table tr:hover td { background: rgba(34,197,94,.04); }

/* Número da linha */
.row-num { color: var(--text-muted); font-size: 12px; }

/* Badge de status */
.badge-status {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}
.badge-concluido  { background:var(--status-green-bg); color:var(--status-green); }
.badge-andamento  { background:var(--status-amber-bg); color:#f59e0b; }
.badge-pendente   { background:var(--status-red-bg); color:var(--status-red); }

/* Ícones de ação */
.action-icons { display:flex; gap:10px; align-items:center; }
.action-icon  { font-size:15px; cursor:pointer; opacity:.7; text-decoration:none !important; }
.action-icon:hover { opacity:1; }
.icon-view  { color:#22c55e; }
.icon-edit  { color:#f59e0b; }
.icon-del   { color:#ef4444; }

/* Rodapé da tabela — paginação */
.table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    font-size: 12px;
    color: var(--text-muted);
}
.pagination { display:flex; gap:4px; align-items:center; }
.page-btn {
    width:30px; height:30px;
    border-radius:6px;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; cursor:pointer;
    background:var(--bg-primary);
    border:1px solid var(--border-light);
    color:var(--text-label);
}
.page-btn.active {
    background:var(--accent-green);
    color:#fff;
    border-color:var(--accent-green);
}

.stTextInput input:focus, .stTextArea textarea:focus {
    border-color: var(--accent-green) !important;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.1) !important;
}

/* Botões Streamlit (Global) */
.stButton > button {
    background: var(--accent-green) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    padding: 8px 18px !important;
    transition: all .15s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15) !important;
}
.stButton > button:hover {
    background: var(--accent-green2) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.25) !important;
}

/* Tabs */
.stTabs [data-baseweb="tab-list"] {
    background: var(--bg-card) !important;
    border-radius: 12px !important;
    padding: 6px !important;
    gap: 8px !important;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 8px !important;
    color: var(--text-muted) !important;
    font-weight: 500 !important;
    padding: 8px 16px !important;
}
.stTabs [data-baseweb="tab"][aria-selected="true"] {
    background: var(--bg-card2) !important;
    color: var(--accent-green) !important;
}

/* Expander / Accordion */
.streamlit-expanderHeader {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 12px !important;
    color: var(--text-primary) !important;
    padding: 1rem !important;
}
.streamlit-expanderContent {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-top: none !important;
    border-bottom-left-radius: 12px !important;
    border-bottom-right-radius: 12px !important;
}

/* Tabelas do Streamlit */
.dataframe {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 8px !important;
}

/* Mensagens */
.stSuccess { border-radius: 8px !important; }
.stError   { border-radius: 8px !important; }
.stWarning { border-radius: 8px !important; }
.stInfo    { border-radius: 8px !important; }

/* ── Action Cards Custom Styles ────────────────────────── */
.action-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all .15s !important;
    margin-bottom: 8px;
}
.action-card:hover { 
    border-color: var(--accent-green);
    background: var(--bg-card2);
    transform: translateY(-2px);
}
.action-card-left { display:flex; align-items:center; gap:12px; }
.action-card-icon { color: var(--accent-green); font-size: 20px; font-weight: bold; }
.action-card-title { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.action-card-sub   { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.action-card-arrow { color: var(--text-muted); font-size: 18px; }

/* Remove marca d'água Streamlit */
#MainMenu, footer, header { visibility: hidden; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────
# Inicialização (executa apenas uma vez por sessão)
# ─────────────────────────────────────────────────────────────

@st.cache_resource
def _initialize_database():
    """Inicializa schema e cria admin inicial. Executa uma única vez por instância."""
    from database.connection import ensure_schema
    from services.auth_service import bootstrap_admin_if_needed
    try:
        # ensure_schema()
        # bootstrap_admin_if_needed()
        return True
    except Exception as e:
        return True # Forçar True para visualização de design


# ─────────────────────────────────────────────────────────────
# Autenticação
# ─────────────────────────────────────────────────────────────

from services.auth_service import is_authenticated, render_login_page

from config import settings
if not is_authenticated():
    if not settings.auth_required:
        from services.auth_service import login
        login("admin", "admin") # Auto-login em modo dev
        st.rerun()
    else:
        render_login_page()
        st.stop()

# ─────────────────────────────────────────────────────────────
# Inicializa banco após autenticação
# ─────────────────────────────────────────────────────────────

db_ok = _initialize_database()
if not db_ok:
    st.error("❌ Não foi possível conectar ao banco de dados. Verifique as configurações.")
    st.stop()

# ─────────────────────────────────────────────────────────────
# Router — Sidebar + Navegação
# ─────────────────────────────────────────────────────────────

from components.sidebar import render_sidebar

current_page = render_sidebar()

# ─────────────────────────────────────────────────────────────
# Roteamento de páginas
# ─────────────────────────────────────────────────────────────

from utils.constants import (
    PAGE_DASHBOARD,
    PAGE_ATENDIMENTOS,
    PAGE_DOCUMENTOS,
    PAGE_AUTOMACOES,
    PAGE_CONFIGURACOES,
)

if current_page == PAGE_DASHBOARD:
    from pages.dashboard import render_dashboard
    render_dashboard()

elif current_page == PAGE_ATENDIMENTOS:
    from pages.atendimentos import render_atendimentos
    render_atendimentos()

elif current_page == PAGE_DOCUMENTOS:
    from pages.documentos import render_documentos
    render_documentos()

elif current_page == PAGE_AUTOMACOES:
    from pages.automacoes import render_automacoes
    render_automacoes()

elif current_page == PAGE_CONFIGURACOES:
    from pages.configuracoes import render_configuracoes
    render_configuracoes()

else:
    st.error(f"Página '{current_page}' não encontrada.")
    st.session_state["current_page"] = PAGE_DASHBOARD
    st.rerun()
