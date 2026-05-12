"""
Configuração central do sistema mvpdepsicologia.
Lê todas as variáveis de ambiente do .env (ou st.secrets no Streamlit Cloud).
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# 1. Carrega o .env usando a biblioteca oficial dotenv
_BASE_DIR = Path(__file__).resolve().parent
_ENV_PATH = _BASE_DIR / ".env"
load_dotenv(_ENV_PATH)

def _get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Lê variável com prioridade:
    1. st.secrets (Streamlit Cloud)
    2. os.environ (local .env)
    3. default
    """
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return str(st.secrets[key])
    except Exception:
        pass
    return os.getenv(key, default)

@dataclass(frozen=True)
class Settings:
    """Configurações centralizadas do sistema."""
    
    # ── Sistema ──────────────────────────────────────────────
    app_name: str = field(default_factory=lambda: _get_secret("APP_NAME", "mvpdepsicologia"))
    app_version: str = field(default_factory=lambda: _get_secret("APP_VERSION", "2.0.0"))
    app_env: str = field(default_factory=lambda: _get_secret("APP_ENV", "development"))
    app_secret_key: str = field(default_factory=lambda: _get_secret("APP_SECRET_KEY", "change-me"))
    log_level: str = field(default_factory=lambda: _get_secret("LOG_LEVEL", "INFO"))

    # ── Banco de Dados (PostgreSQL) ───────────────────────────
    database_url: Optional[str] = field(default_factory=lambda: _get_secret("DATABASE_URL"))
    db_host: Optional[str] = field(default_factory=lambda: _get_secret("db_host"))
    db_port: str = field(default_factory=lambda: _get_secret("db_port", "5432"))
    db_name: Optional[str] = field(default_factory=lambda: _get_secret("db_name"))
    db_user: Optional[str] = field(default_factory=lambda: _get_secret("db_user"))
    db_password: Optional[str] = field(default_factory=lambda: _get_secret("db_password"))
    db_sslmode: str = field(default_factory=lambda: _get_secret("db_sslmode", "require"))

    # ── Google Gemini AI ──────────────────────────────────────
    gemini_api_key: Optional[str] = field(default_factory=lambda: _get_secret("GOOGLE_API_KEY") or _get_secret("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: _get_secret("GEMINI_MODEL", "gemini-2.5-flash"))

    # ── n8n Cloud ─────────────────────────────────────────────
    n8n_webhook_base_url: Optional[str] = field(default_factory=lambda: _get_secret("N8N_WEBHOOK_BASE_URL"))
    n8n_webhook_secret: Optional[str] = field(default_factory=lambda: _get_secret("N8N_WEBHOOK_SECRET"))

    # ── Google Docs ───────────────────────────────────────────
    google_docs_template_id: Optional[str] = field(default_factory=lambda: _get_secret("GOOGLE_DOCS_TEMPLATE_ID"))

    # ── Autenticação ──────────────────────────────────────────
    auth_username: str = field(default_factory=lambda: _get_secret("APP_ADMIN_USER", "admin"))
    auth_password: Optional[str] = field(default_factory=lambda: _get_secret("APP_ADMIN_PASS"))
    auth_required: bool = field(default_factory=lambda: _get_secret("APP_REQUIRE_AUTH", "true") == "true")

    @property
    def has_database(self) -> bool:
        return bool(self.database_url or (self.db_host and self.db_name))

    @property
    def has_ai(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_n8n(self) -> bool:
        return bool(self.n8n_webhook_base_url)

# Singleton global
settings = Settings()
