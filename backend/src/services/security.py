from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from core.config import settings

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Gera um token JWT para um usuário autenticado.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_access_token(token: str):
    """
    Verifica se o token JWT é válido e não expirou.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None
