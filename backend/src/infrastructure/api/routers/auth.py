"""Auth router — token endpoint + Google/Microsoft/Apple OAuth.

Includes the password-based login, brute-force protection,
OAuth2 redirect/callback flows for Google, Microsoft and Apple,
and the Pydantic models needed for token responses.
"""

import os
import secrets
import time
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from core.config import settings
from core.repositories.user_repositories import user_repo
from services.lgpd_service import get_lgpd_service
from services.security import create_access_token
from utils.helpers import verify_password
from utils.logger import get_logger

from infrastructure.api.routers.deps import (
    _get_client_ip,
    get_current_user,
    oauth2_scheme,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api")

# ─────────────────────────────────────────────────────────────
# OAuth CSRF state store (in-memory, TTL 10 min)
# ─────────────────────────────────────────────────────────────
_oauth_state_store: dict[str, float] = {}
_STATE_TTL_SECONDS = 600


def _generate_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_state_store[state] = time.time()
    return state


def _validate_state(state: str) -> bool:
    if not state or state not in _oauth_state_store:
        return False
    created = _oauth_state_store.pop(state)
    return (time.time() - created) < _STATE_TTL_SECONDS


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────


@router.post("/token", response_model=TokenResponse, tags=["Auth"])
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Login com proteção contra força bruta.
    Bloqueia após MAX_LOGIN_ATTEMPTS tentativas em LOGIN_BLOCK_MINUTES minutos.
    """
    lgpd = get_lgpd_service()
    ip = _get_client_ip(request)

    # ── Brute force check ─────────────────────────────────────
    if lgpd.verificar_bloqueio_login(form_data.username, ip):
        raise HTTPException(
            status_code=429,
            detail=(
                f"Conta temporariamente bloqueada por excesso de tentativas. "
                f"Tente novamente em {os.getenv('LOGIN_BLOCK_MINUTES', '15')} minutos."
            ),
        )

    # ── Autenticação ──────────────────────────────────────────
    authenticated = False
    user_role = "admin"

    # Modo 1: usuário do banco
    user = user_repo.find_by_username(form_data.username)
    if user:
        stored_hash = user_repo.get_password_hash(user.username)
        if stored_hash and verify_password(form_data.password, stored_hash):
            authenticated = True
            user_role = user.role
            username_canonical = user.username

    # Modo 2: fallback .env (compatibilidade)
    if not authenticated and settings.auth_password:
        env_valid = (form_data.username == settings.auth_username) and (
            form_data.password == settings.auth_password
            or verify_password(form_data.password, settings.auth_password)
        )
        if env_valid:
            authenticated = True
            username_canonical = form_data.username

    # ── Resultado ─────────────────────────────────────────────
    lgpd.registrar_tentativa_login(form_data.username, authenticated, ip)

    if not authenticated:
        raise HTTPException(
            status_code=401,
            detail="Usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": form_data.username, "role": user_role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────
# Google OAuth 2.0 — Login Social
# ─────────────────────────────────────────────────────────────


@router.get("/auth/google", tags=["Auth"])
async def google_oauth_redirect():
    """Inicia o fluxo OAuth com Google. Redireciona para a tela de consentimento."""
    client_id = settings.google_oauth_client_id
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Login com Google não configurado. Configure GOOGLE_OAUTH_CLIENT_ID.",
        )
    import urllib.parse

    state = _generate_state()
    redirect_uri = f"{settings.frontend_url.rstrip('/')}/api/auth/google/callback"
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    })
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/auth/google/callback", tags=["Auth"])
async def google_oauth_callback(code: str = None, error: str = None, state: str = None):
    """Recebe o callback do Google, troca o code por token e gera JWT interno."""
    import urllib.parse

    frontend_base = settings.frontend_url.rstrip("/")

    if not _validate_state(state):
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=csrf_invalido")

    if error or not code:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=acesso_negado")

    client_id = settings.google_oauth_client_id
    client_secret = settings.google_oauth_client_secret
    if not client_id or not client_secret:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=nao_configurado")

    # Troca code por access_token
    try:
        import httpx  # type: ignore
        redirect_uri = f"{frontend_base}/api/auth/google/callback"
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
        token_data = token_res.json()
        if "error" in token_data:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=token_invalido")

        # Busca info do usuário
        async with httpx.AsyncClient() as client:
            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
                timeout=10,
            )
        user_info = user_res.json()

        email: str = user_info.get("email", "")
        name: str = user_info.get("name", email.split("@")[0] if email else "Usuário")
        picture: str = user_info.get("picture", "")

        if not email:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=email_nao_obtido")

        # Gera JWT interno para o usuário Google
        jwt_token = create_access_token(
            data={"sub": email, "name": name, "picture": picture, "provider": "google"},
            expires_delta=timedelta(minutes=settings.jwt_expiration_minutes),
        )
        params = urllib.parse.urlencode({"token": jwt_token, "name": name})
        return RedirectResponse(url=f"{frontend_base}/auth/callback?{params}")

    except ImportError:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=httpx_nao_instalado")
    except Exception as exc:
        logger.error(f"Google OAuth callback error: {exc}")
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=erro_interno")


# ─────────────────────────────────────────────────────────────
# Microsoft OAuth 2.0 — Login Social
# ─────────────────────────────────────────────────────────────


@router.get("/auth/microsoft", tags=["Auth"])
async def microsoft_oauth_redirect():
    """Inicia o fluxo OAuth com Microsoft. Redireciona para a tela de consentimento."""
    client_id = settings.microsoft_oauth_client_id
    tenant_id = settings.microsoft_oauth_tenant_id
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Login com Microsoft não configurado. Configure MICROSOFT_OAUTH_CLIENT_ID.",
        )
    import urllib.parse

    state = _generate_state()
    redirect_uri = f"{settings.frontend_url.rstrip('/')}/api/auth/microsoft/callback"
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    })
    return RedirectResponse(
        url=f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?{params}"
    )


@router.get("/auth/microsoft/callback", tags=["Auth"])
async def microsoft_oauth_callback(code: str = None, error: str = None, state: str = None):
    """Recebe o callback do Microsoft, troca o code por token e gera JWT interno."""
    import urllib.parse

    frontend_base = settings.frontend_url.rstrip("/")

    if not _validate_state(state):
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=csrf_invalido")

    if error or not code:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=acesso_negado")

    client_id = settings.microsoft_oauth_client_id
    client_secret = settings.microsoft_oauth_client_secret
    tenant_id = settings.microsoft_oauth_tenant_id
    if not client_id or not client_secret:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=nao_configurado")

    try:
        import httpx

        redirect_uri = f"{frontend_base}/api/auth/microsoft/callback"
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
        token_data = token_res.json()
        if "error" in token_data:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=token_invalido")

        access_token = token_data.get("access_token")
        async with httpx.AsyncClient() as client:
            user_res = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
        user_info = user_res.json()

        email: str = user_info.get("mail") or user_info.get("userPrincipalName", "")
        name: str = user_info.get("displayName", email.split("@")[0] if email else "Usuário")

        if not email:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=email_nao_obtido")

        jwt_token = create_access_token(
            data={"sub": email, "name": name, "provider": "microsoft"},
            expires_delta=timedelta(minutes=settings.jwt_expiration_minutes),
        )
        params = urllib.parse.urlencode({"token": jwt_token, "name": name})
        return RedirectResponse(url=f"{frontend_base}/auth/callback?{params}")

    except ImportError:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=httpx_nao_instalado")
    except Exception as exc:
        logger.error(f"Microsoft OAuth callback error: {exc}")
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=erro_interno")


# ─────────────────────────────────────────────────────────────
# Apple OAuth 2.0 — Login Social
# ─────────────────────────────────────────────────────────────


@router.get("/auth/apple", tags=["Auth"])
async def apple_oauth_redirect():
    """Inicia o fluxo OAuth com Apple. Redireciona para a tela de consentimento."""
    client_id = settings.apple_oauth_client_id
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Login com Apple não configurado. Configure APPLE_OAUTH_CLIENT_ID.",
        )
    import urllib.parse

    state = _generate_state()
    redirect_uri = f"{settings.frontend_url.rstrip('/')}/api/auth/apple/callback"
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "name email",
        "response_mode": "query",
        "state": state,
    })
    return RedirectResponse(url=f"https://appleid.apple.com/auth/authorize?{params}")


@router.get("/auth/apple/callback", tags=["Auth"])
async def apple_oauth_callback(code: str = None, error: str = None, state: str = None):
    """Recebe o callback do Apple, troca o code por token e gera JWT interno."""
    import urllib.parse

    frontend_base = settings.frontend_url.rstrip("/")

    if not _validate_state(state):
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=csrf_invalido")

    if error or not code:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=acesso_negado")

    client_id = settings.apple_oauth_client_id
    team_id = settings.apple_oauth_team_id
    key_id = settings.apple_oauth_key_id
    if not client_id or not team_id or not key_id:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=nao_configurado")

    try:
        import httpx
        import jwt as pyjwt
        import time

        now = int(time.time())
        client_secret = pyjwt.encode(
            {
                "iss": team_id,
                "iat": now,
                "exp": now + 15777000,
                "aud": "https://appleid.apple.com",
                "sub": client_id,
            },
            settings.apple_oauth_private_key,
            algorithm="ES256",
            headers={"kid": key_id},
        )

        redirect_uri = f"{frontend_base}/api/auth/apple/callback"
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://appleid.apple.com/auth/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
        token_data = token_res.json()
        if "error" in token_data:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=token_invalido")

        id_token = token_data.get("id_token")
        if not id_token:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=token_invalido")

        # Decodifica o ID token (Apple não requer verificação de assinatura para login)
        payload = pyjwt.decode(id_token, options={"verify_signature": False})
        email: str = payload.get("email", "")
        sub: str = payload.get("sub", "")

        if not email:
            return RedirectResponse(url=f"{frontend_base}/auth/callback?error=email_nao_obtido")

        name = payload.get("name", {})
        full_name = ""
        if isinstance(name, dict):
            given = name.get("givenName", "")
            family = name.get("familyName", "")
            full_name = f"{given} {family}".strip()
        if not full_name:
            full_name = email.split("@")[0]

        jwt_token = create_access_token(
            data={"sub": email, "name": full_name, "provider": "apple"},
            expires_delta=timedelta(minutes=settings.jwt_expiration_minutes),
        )
        params = urllib.parse.urlencode({"token": jwt_token, "name": full_name})
        return RedirectResponse(url=f"{frontend_base}/auth/callback?{params}")

    except ImportError:
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=httpx_nao_instalado")
    except Exception as exc:
        logger.error(f"Apple OAuth callback error: {exc}")
        return RedirectResponse(url=f"{frontend_base}/auth/callback?error=erro_interno")
