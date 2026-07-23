from datetime import datetime, timedelta, UTC

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from core.config import settings
from core.repositories.user_repositories import user_repo
from utils.helpers import verify_password
from services.security import create_access_token
from utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Auth Service (PoC)")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    message: str
    user_id: int | None = None
    display_name: str | None = None
    role: str | None = None


@app.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    username = (req.username or '').strip()
    password = req.password or ''

    if not username or not password:
        raise HTTPException(status_code=400, detail="Preencha usuário e senha.")

    # Dev mode: shortcut via env
    if not settings.auth_required:
        token = create_access_token({"sub": username})
        return LoginResponse(access_token=token, message="Acesso liberado (modo desenvolvimento).", user_id=0, display_name=username, role="admin")

    # Primary: database auth
    try:
        user = user_repo.find_by_username(username)
    except Exception as e:
        logger.error(f"AUTH-API: erro ao buscar usuário: {e}")
        user = None

    if user:
        stored_hash = user_repo.get_password_hash(username)
        if stored_hash and verify_password(password, stored_hash):
            token = create_access_token({"sub": username, "user_id": user.id, "role": user.role})
            return LoginResponse(access_token=token, message=f"Bem-vindo(a), {user.display_name}!", user_id=user.id, display_name=user.display_name, role=user.role)

    # Fallback: .env creds
    if settings.auth_password and username.lower() == settings.auth_username.lower() and verify_password(password, settings.auth_password):
        token = create_access_token({"sub": username})
        return LoginResponse(access_token=token, message="Login via .env", user_id=0, display_name=username, role="admin")

    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")


@app.get("/healthz")
def health():
    return {"status": "ok"}
