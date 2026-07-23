"""Shared dependencies for API routers.

Provides the OAuth2PasswordBearer scheme, the ``get_current_user`` dependency,
the ``require_permission`` RBAC dependency, the ``_get_client_ip`` helper,
the ``_slug_name`` utility used across multiple routers, and the ``run_sync``
helper for running blocking repo calls from async endpoints.
"""

import asyncio
import re as _re
import unicodedata as _ud
from functools import partial
from typing import Callable, TypeVar

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from services.security import verify_access_token
from utils.constants import ROLE_PERMISSIONS

T = TypeVar("T")


async def run_sync(fn: Callable[..., T], *args, **kwargs) -> T:
    """Run a synchronous (blocking) callable in the default executor so the
    event loop is not blocked.  Use this for all repository / DB calls inside
    ``async def`` endpoints."""
    return await asyncio.get_event_loop().run_in_executor(
        None, lambda: fn(*args, **kwargs)
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Valida JWT e retorna o payload do usuário logado."""
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def require_permission(permission: str):
    """Factory que retorna uma dependency que verifica se o role do usuário tem a permissão."""

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "")
        allowed = ROLE_PERMISSIONS.get(user_role, [])
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão negada: {permission}.",
            )
        return current_user

    return _check


def _get_client_ip(request: Request) -> str:
    """Extrai o IP real do cliente (considera proxies/Vercel)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _slug_name(name: str) -> str:
    """Gera um slug a partir do nome do paciente para buscas de foto."""
    s = (name or "").strip().lower()
    s = _ud.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = _re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")
