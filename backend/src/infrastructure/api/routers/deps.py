"""Shared dependencies for API routers.

Provides the OAuth2PasswordBearer scheme, the ``get_current_user`` dependency,
the ``_get_client_ip`` helper, and the ``_slug_name`` utility used across
multiple routers.
"""

import re as _re

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from services.security import verify_access_token

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


def _get_client_ip(request: Request) -> str:
    """Extrai o IP real do cliente (considera proxies/Vercel)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _slug_name(name: str) -> str:
    """Gera um slug a partir do nome do paciente para buscas de foto."""
    s = (name or "").strip().lower()
    s = _re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")
