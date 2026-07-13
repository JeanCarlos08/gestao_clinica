"""
API FastAPI — Clínica IA v3.0

Ponto de entrada principal. Configura o app, inclui routers
e gerencia startup (schema + admin bootstrap).

Endpoints organizados em routers:
- auth, dashboard, atendimentos, pacientes, ia, laudos,
- relatorios, upload, configuracoes, lgpd, docs, health
"""

import os
from datetime import timedelta

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from infrastructure.connection import ensure_schema
from utils.logger import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Clínica IA API",
    version="3.0.0",
    description="API de gestão clínica com conformidade LGPD completa.",
)

# ─────────────────────────────────────────────────────────────
# Startup — schema & admin bootstrap
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup() -> None:
    try:
        ensure_schema()
        logger.info("Startup: Schema verificado/criado com sucesso.")
    except Exception as e:
        logger.error(f"Startup: falha ao garantir schema: {e}")

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

    # Background task: revoga permissões temporárias expiradas
    try:
        import asyncio

        async def _revoke_loop():
            from core.repositories.repositories import temporary_permission_repo
            from services.credentials_loader import load_credentials
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

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
                            logger.warning(f"Revoker: não foi possível inicializar Drive client: {e}")
                            expired = []

                        for item in expired:
                            try:
                                drive.permissions().delete(fileId=item["google_doc_id"], permissionId=item["permission_id"]).execute()
                                temporary_permission_repo.mark_revoked(item["id"])
                                logger.info(f"Revoked temporary permission {item['permission_id']} for doc {item['google_doc_id']}")
                            except Exception as e:
                                logger.warning(f"Erro ao revogar permissão automática: {e}")
                except Exception as e:
                    logger.debug(f"Revoker loop error: {e}")
                await asyncio.sleep(60)

        asyncio.create_task(_revoke_loop())
    except Exception as e:
        logger.debug(f"Não foi possível iniciar revoker loop: {e}")

# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

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
