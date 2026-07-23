"""
API FastAPI — Clínica IA v3.0

Ponto de entrada principal. Configura o app, inclui routers
e gerencia startup (schema + admin bootstrap).

Endpoints organizados em routers:
- auth, dashboard, atendimentos, pacientes, ia, laudos,
- relatorios, upload, configuracoes, lgpd, docs, health
"""

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import timedelta

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from infrastructure.api.limiter import limiter

from core.config import settings
from infrastructure.connection import ensure_schema
from utils.constants import APP_VERSION
from utils.logger import get_logger

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────
# Background tasks
# ─────────────────────────────────────────────────────────────
_revoke_task = None


async def _revoke_loop():
    from core.repositories.repositories import temporary_permission_repo
    try:
        from services.credentials_loader import load_credentials
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        return

    while True:
        try:
            expired = temporary_permission_repo.list_expired()
            if expired:
                try:
                    creds = load_credentials()
                    scopes = ["https://www.googleapis.com/auth/drive"]
                    sa_creds = service_account.Credentials.from_service_account_info(creds, scopes=scopes)
                    drive = build("drive", "v3", credentials=sa_creds, cache_discovery=False)
                except Exception as e:
                    logger.warning(f"Revoker: Drive client init falhou: {e}")
                    expired = []

                for item in expired:
                    try:
                        drive.permissions().delete(fileId=item["google_doc_id"], permissionId=item["permission_id"]).execute()
                        temporary_permission_repo.mark_revoked(item["id"])
                        logger.info(f"Revoked permission {item['permission_id']} for doc {item['google_doc_id']}")
                    except Exception as e:
                        logger.warning(f"Erro ao revogar permissão: {e}")
        except Exception as e:
            logger.debug(f"Revoker loop error: {e}")
        await asyncio.sleep(60)


# ─────────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app):
    global _revoke_task

    # ── Startup ──────────────────────────────────────────────
    try:
        ensure_schema()
        logger.info("Startup: Schema verificado/criado com sucesso.")
    except Exception as e:
        logger.error(f"Startup: falha ao garantir schema: {e}")

    try:
        from core.repositories.repositories import paciente_repo, preferences_repo
        migrated = paciente_repo.migrate_fotos_from_preferences(preferences_repo)
        if migrated:
            logger.info(f"Startup: {migrated} fotos migradas de user_preferences para pacientes.")
    except Exception as e:
        logger.debug(f"Startup: migração de fotos ignorada: {e}")

    try:
        from core.repositories.user_repositories import user_repo
        from utils.helpers import hash_password

        admin_user = settings.auth_username
        admin_pass = settings.auth_password
        if admin_pass:
            user_repo.bootstrap_admin(
                username=admin_user,
                display_name="Administrador",
                password_hash=hash_password(admin_pass),
            )
    except Exception as e:
        logger.warning(f"Startup: bootstrap do admin não concluído: {e}")

    try:
        _revoke_task = asyncio.create_task(_revoke_loop())
    except Exception as e:
        logger.debug(f"Não foi possível iniciar revoker loop: {e}")

    yield

    # ── Shutdown ─────────────────────────────────────────────
    if _revoke_task and not _revoke_task.done():
        _revoke_task.cancel()
        try:
            await _revoke_task
        except asyncio.CancelledError:
            pass


# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Clínica IA API",
    version=APP_VERSION,
    description=(
        "API de gestão clínica com conformidade LGPD completa.\n\n"
        "## Autenticação\n"
        "Use `POST /api/token` com `username` + `password` (form-encoded) ou OAuth2 social login.\n\n"
        "## Rate Limits\n"
        "- Login: 10 req/min\n"
        "- Refresh: 20 req/min\n"
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {"name": "Auth", "description": "Autenticação e sessão"},
        {"name": "Dashboard", "description": "Estatísticas e resumo"},
        {"name": "Atendimentos", "description": "CRUD de atendimentos"},
        {"name": "Pacientes", "description": "Lista e fotos de pacientes"},
        {"name": "IA", "description": "Inteligência artificial (Gemini)"},
        {"name": "Laudos", "description": "Geração e exportação de laudos"},
        {"name": "Relatórios", "description": "Estatísticas e filtros para relatórios"},
        {"name": "Upload", "description": "Upload e gestão de arquivos"},
        {"name": "Configurações", "description": "Configurações da clínica e auditoria"},
        {"name": "LGPD", "description": "Conformidade LGPD (consentimentos, portabilidade)"},
        {"name": "Docs", "description": "Google Docs embed e permissões"},
        {"name": "Health", "description": "Health check"},
    ],
)

# ─────────────────────────────────────────────────────────────
# Rate Limiter
# ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

if settings.app_env == "production" and "http://localhost:3000" in ALLOWED_ORIGINS:
    logger.warning("CORS: localhost em produção. Defina ALLOWED_ORIGINS corretamente.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# ─────────────────────────────────────────────────────────────
# Security Headers
# ─────────────────────────────────────────────────────────────
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ─────────────────────────────────────────────────────────────
# Request ID, Timing, Logging
# ─────────────────────────────────────────────────────────────
from infrastructure.api.middleware import (
    RequestIDMiddleware,
    TimingMiddleware,
    StructuredLoggingMiddleware,
)

app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestIDMiddleware)

# ─────────────────────────────────────────────────────────────
# Gzip Compression
# ─────────────────────────────────────────────────────────────
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=500)

# ─────────────────────────────────────────────────────────────
# OpenAPI Security Scheme
# ─────────────────────────────────────────────────────────────

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
    )
    schema["components"] = schema.get("components", {})
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT access token from POST /api/token",
        },
    }
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi

# ─────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────

from infrastructure.api.routers.auth import router as auth_router
from infrastructure.api.routers.dashboard import router as dashboard_router
from infrastructure.api.routers.atendimentos import router as atendimentos_router
from infrastructure.api.routers.pacientes import router as pacientes_router
from infrastructure.api.routers.ia import router as ia_router
from infrastructure.api.routers.laudos import router as laudos_router
from infrastructure.api.routers.relatorios import router as relatorios_router
from infrastructure.api.routers.upload import router as upload_router
from infrastructure.api.routers.configuracoes import router as configuracoes_router
from infrastructure.api.routers.lgpd import router as lgpd_router
from infrastructure.api.routers.docs import router as docs_router
from infrastructure.api.routers.health import router as health_router

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(atendimentos_router)
app.include_router(pacientes_router)
app.include_router(ia_router)
app.include_router(laudos_router)
app.include_router(relatorios_router)
app.include_router(upload_router)
app.include_router(configuracoes_router)
app.include_router(lgpd_router)
app.include_router(docs_router)
app.include_router(health_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
