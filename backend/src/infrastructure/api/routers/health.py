"""Health check router — public and authenticated health endpoints."""

import os
import sys
import time
from fastapi import APIRouter, Depends

from infrastructure.api.routers.deps import get_current_user, require_permission, run_sync
from infrastructure.api.routers.repo_deps import get_atendimento_repo
from utils.constants import PERM_VIEW_CONFIGURACOES, APP_VERSION

router = APIRouter(prefix="/api")

_start_time = time.time()


@router.get("/health", tags=["Health"])
async def health_check():
    """Health check público — não expõe internals."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "uptime_seconds": int(time.time() - _start_time),
    }


@router.get("/health/detail", tags=["Health"])
async def health_detail(current_user: dict = Depends(get_current_user)):
    """Health check detalhado — requer autenticação.
    Verifica conectividade com o banco de dados."""
    from infrastructure.connection import connection_scope

    db_ok = False
    db_latency_ms = None
    try:
        t0 = time.time()
        with connection_scope(commit=False) as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
        db_latency_ms = round((time.time() - t0) * 1000, 2)
        db_ok = True
    except Exception:
        pass

    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "version": APP_VERSION,
        "uptime_seconds": int(time.time() - _start_time),
        "checks": {
            "database": {
                "status": "ok" if db_ok else "error",
                "latency_ms": db_latency_ms,
            },
        },
    }


@router.get("/system/info", tags=["System"])
async def system_info(current_user: dict = Depends(get_current_user)):
    """Informações do sistema (Python, SO, memória)."""
    import platform
    try:
        import psutil
        mem = psutil.virtual_memory()
        mem_info = {"total_gb": round(mem.total / (1024**3), 1), "used_percent": mem.percent}
    except ImportError:
        mem_info = None

    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "pid": os.getpid(),
        "memory": mem_info,
        "uptime_seconds": int(time.time() - _start_time),
    }


@router.get("/system/db-stats", tags=["System"])
async def db_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas de contagem das tabelas do banco."""
    from infrastructure.connection import get_table_counts
    return await run_sync(get_table_counts)
