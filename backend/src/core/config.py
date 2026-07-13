"""
Configuração central do sistema mvpdepsicologia.
Lê todas as variáveis de ambiente do .env e do ambiente de runtime.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# 1. Carrega o .env — testa múltiplos caminhos (dev local vs Docker/Render)
# Em produção (Render) as vars são injetadas como env vars — load_dotenv não sobrescreve.
# Rastreamento real de _BASE_DIR = backend/src/core/
_BASE_DIR = Path(__file__).resolve().parent
for _env_candidate in [
    _BASE_DIR / ".env",                        # backend/src/core/.env
    _BASE_DIR.parent / ".env",                 # backend/src/.env
    _BASE_DIR.parent.parent / ".env",          # backend/.env  ← dev local
    _BASE_DIR.parent.parent.parent / ".env",   # <raiz_projeto>/.env
]:
    if _env_candidate.exists():
        load_dotenv(_env_candidate, override=False)
        break

def _get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Lê variável de ambiente com fallback opcional."""
    value = os.getenv(key, default)
    return value.strip() if isinstance(value, str) else value


def _gemini_fallback_models() -> list[str]:
    """Retorna lista ordenada de modelos Gemini para fallback."""
    raw = _get_secret("GEMINI_FALLBACK_MODELS", "") or ""
    custom_models = [m.strip() for m in raw.split(",") if m.strip()]

    # Ordem: modelo principal configurado + fallback explícito + defaults seguros.
    candidates = [
        _get_secret("GEMINI_MODEL", "gemini-2.5-flash") or "gemini-2.5-flash",
        *custom_models,
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]

    # Remove duplicados preservando ordem.
    unique: list[str] = []
    for model in candidates:
        if model not in unique:
            unique.append(model)
    return unique

@dataclass(frozen=True)
class Settings:
    """Configurações centralizadas do sistema."""
    
    # ── Sistema ──────────────────────────────────────────────
    app_name: str = field(default_factory=lambda: _get_secret("APP_NAME", "mvpdepsicologia"))
    app_version: str = field(default_factory=lambda: _get_secret("APP_VERSION", "3.0.0"))
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
    gemini_fallback_models: list[str] = field(default_factory=_gemini_fallback_models)

    # ── Google Docs ───────────────────────────────────────────
    google_docs_template_id: Optional[str] = field(default_factory=lambda: _get_secret("GOOGLE_DOCS_TEMPLATE_ID"))

    # ── Google OAuth (login social) ───────────────────────────
    google_oauth_client_id: Optional[str] = field(default_factory=lambda: _get_secret("GOOGLE_OAUTH_CLIENT_ID"))
    google_oauth_client_secret: Optional[str] = field(default_factory=lambda: _get_secret("GOOGLE_OAUTH_CLIENT_SECRET"))
    frontend_url: str = field(default_factory=lambda: _get_secret("FRONTEND_URL", "https://gestao-clinica.vercel.app"))

    # ── Autenticação ──────────────────────────────────────────
    auth_username: str = field(default_factory=lambda: _get_secret("APP_ADMIN_USER", "admin"))
    auth_password: Optional[str] = field(default_factory=lambda: _get_secret("APP_ADMIN_PASS"))
    auth_required: bool = field(default_factory=lambda: _get_secret("APP_REQUIRE_AUTH", "true") == "true")
    
    # ── Segurança JWT ─────────────────────────────────────────
    jwt_secret_key: str = field(default_factory=lambda: _get_secret("JWT_SECRET_KEY", "change-me-securely"))
    jwt_algorithm: str = field(default_factory=lambda: _get_secret("JWT_ALGORITHM", "HS256"))
    jwt_expiration_minutes: int = field(default_factory=lambda: int(_get_secret("JWT_EXPIRATION_MINUTES", "1440"))) # 24h

    @property
    def has_database(self) -> bool:
        return bool(self.database_url or (self.db_host and self.db_name))

    @property
    def has_ai(self) -> bool:
        return bool(self.gemini_api_key)

# Singleton global
settings = Settings()
