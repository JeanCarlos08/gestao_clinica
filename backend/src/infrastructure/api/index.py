"""
API FastAPI — Clínica IA

Inclui:
- CORS restrito via ALLOWED_ORIGINS (.env)
- Pydantic models em todos os endpoints
- Brute force protection (MAX_LOGIN_ATTEMPTS / LOGIN_BLOCK_MINUTES)
- Endpoints LGPD: consentimento, portabilidade, direito ao esquecimento
- Auditoria de todas as ações sensíveis
"""

import os
from typing import Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from core.config import settings
from core.repositories.repositories import atendimento_repo
from core.repositories.user_repositories import user_repo
from services.lgpd_service import get_lgpd_service
from services.security import create_access_token, verify_access_token
from utils.helpers import verify_password
from utils.logger import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────
# App e CORS
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Clínica IA API",
    version="2.1.0",
    description="API de gestão clínica com conformidade LGPD completa.",
)

# CORS: lê domínios permitidos do .env — NUNCA usar "*" em produção
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AtendimentoResponse(BaseModel):
    id: int
    empresa: str
    nome: str
    modalidade: str
    data: str
    hora: str
    status: str


class ConsentimentoCreate(BaseModel):
    titular_nome: str = Field(..., min_length=3, max_length=255)
    titular_email: Optional[str] = Field(None, max_length=255)
    finalidade: str = Field(
        ...,
        description="Ex: laudos_psicologicos, agendamento, comunicacao",
    )
    base_legal: str = Field(
        default="consentimento",
        description="Base legal LGPD: consentimento, contrato, obrigacao_legal, tutela_saude",
    )


class ConsentimentoResponse(BaseModel):
    sucesso: bool
    consentimento_id: Optional[int] = None
    mensagem: Optional[str] = None
    erro: Optional[str] = None


class EsquecimentoRequest(BaseModel):
    email: str = Field(..., description="E-mail do titular para executar o esquecimento")
    nome: Optional[str] = Field(None, description="Nome para localizar e anonimizar atendimentos")
    confirmacao: str = Field(
        ...,
        description="Deve ser exatamente 'CONFIRMO_EXCLUSAO_PERMANENTE'",
    )


class EsquecimentoResponse(BaseModel):
    sucesso: bool
    executado_em: Optional[str] = None
    consentimentos_removidos: int = 0
    atendimentos_anonimizados: int = 0
    erro: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter

api_router = APIRouter(prefix="/api")


# ─────────────────────────────────────────────────────────────
# Dependência de Autenticação
# ─────────────────────────────────────────────────────────────


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


# ─────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.post("/token", response_model=TokenResponse, tags=["Auth"])
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
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": form_data.username, "role": user_role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────
# Atendimentos Endpoints
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/atendimentos",
    response_model=list[AtendimentoResponse],
    tags=["Atendimentos"],
)
async def list_atendimentos(current_user: dict = Depends(get_current_user)):
    """Lista atendimentos (requer autenticação)."""
    atendimentos = atendimento_repo.list_all(limit=100)
    return [
        {
            "id": a.id,
            "empresa": a.empresa,
            "nome": a.nome,
            "modalidade": a.modalidade,
            "data": a.data.strftime("%d/%m/%Y") if a.data else "",
            "hora": a.hora.strftime("%H:%M") if a.hora else "",
            "status": a.status,
        }
        for a in atendimentos
    ]


@api_router.get("/stats", tags=["Dashboard"])
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas do dashboard (requer autenticação)."""
    return atendimento_repo.get_stats()


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Consentimento
# ─────────────────────────────────────────────────────────────


@api_router.post(
    "/lgpd/consentimentos",
    response_model=ConsentimentoResponse,
    tags=["LGPD"],
    summary="Registrar consentimento do titular (LGPD Art. 8º)",
)
async def registrar_consentimento(request: Request, body: ConsentimentoCreate):
    """
    Registra o consentimento do titular para tratamento de dados pessoais.
    Armazena data/hora, IP, finalidade e base legal conforme exigido pela LGPD.
    """
    lgpd = get_lgpd_service()
    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    resultado = lgpd.registrar_consentimento(
        titular_nome=body.titular_nome,
        finalidade=body.finalidade,
        titular_email=body.titular_email,
        base_legal=body.base_legal,
        ip_origem=ip,
        user_agent=user_agent,
    )
    if not resultado["sucesso"]:
        raise HTTPException(status_code=400, detail=resultado.get("erro"))
    return resultado


@api_router.get(
    "/lgpd/consentimentos/{email}",
    tags=["LGPD"],
    summary="Consultar consentimentos do titular (Art. 18, I - Direito de acesso)",
)
async def consultar_consentimentos(email: str, current_user: dict = Depends(get_current_user)):
    """
    Retorna todos os consentimentos registrados para um e-mail.
    Requer autenticação (operador ou o próprio titular via token).
    """
    lgpd = get_lgpd_service()
    registros = lgpd.buscar_consentimentos(email)
    return {"email": email, "total": len(registros), "consentimentos": registros}


@api_router.delete(
    "/lgpd/consentimentos/{email}",
    tags=["LGPD"],
    summary="Revogar consentimento (LGPD Art. 8º, §5º)",
)
async def revogar_consentimento(email: str, current_user: dict = Depends(get_current_user)):
    """
    Revoga todos os consentimentos ativos de um titular.
    O consentimento pode ser revogado a qualquer momento (LGPD Art. 8º, §5º).
    """
    lgpd = get_lgpd_service()
    return lgpd.revogar_consentimento(email)


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Direitos do Titular
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/lgpd/titulares/{email}/dados",
    tags=["LGPD"],
    summary="Portabilidade de dados (Art. 18, V)",
)
async def exportar_dados_titular(
    email: str,
    nome: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Exporta todos os dados pessoais do titular em formato estruturado (JSON).
    Implementa o Direito à Portabilidade (LGPD Art. 18, V).
    """
    lgpd = get_lgpd_service()
    return lgpd.exportar_dados_titular(email=email, nome=nome)


@api_router.post(
    "/lgpd/titulares/esquecimento",
    response_model=EsquecimentoResponse,
    tags=["LGPD"],
    summary="Direito ao esquecimento / eliminação (Art. 18, VI)",
)
async def executar_esquecimento(
    body: EsquecimentoRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Remove permanentemente todos os dados pessoais do titular.
    Implementa o Direito ao Esquecimento (LGPD Art. 18, VI).

    ATENÇÃO: Operação IRREVERSÍVEL. Requer confirmação explícita.
    """
    if body.confirmacao != "CONFIRMO_EXCLUSAO_PERMANENTE":
        raise HTTPException(
            status_code=400,
            detail="Confirmação inválida. Envie confirmacao='CONFIRMO_EXCLUSAO_PERMANENTE'.",
        )
    lgpd = get_lgpd_service()
    return lgpd.executar_esquecimento(email=body.email, nome=body.nome)


# ─────────────────────────────────────────────────────────────
# LGPD Info Pública (sem autenticação)
# ─────────────────────────────────────────────────────────────


@api_router.get(
    "/lgpd/info",
    tags=["LGPD"],
    summary="Informações LGPD públicas (DPO, bases legais)",
)
async def info_lgpd():
    """
    Retorna informações públicas sobre o tratamento de dados:
    DPO, bases legais, finalidades e como exercer direitos.
    """
    lgpd = get_lgpd_service()
    return {
        "controlador": os.getenv("APP_NAME", "Clínica IA"),
        "dpo": lgpd.info_dpo(),
        "bases_legais": lgpd.bases_legais(),
        "direitos_titulares": {
            "acesso": "GET /api/lgpd/titulares/{email}/dados",
            "portabilidade": "GET /api/lgpd/titulares/{email}/dados",
            "revogacao": "DELETE /api/lgpd/consentimentos/{email}",
            "esquecimento": "POST /api/lgpd/titulares/esquecimento",
        },
        "lei": "LGPD — Lei nº 13.709/2018",
        "anpd": "https://www.gov.br/anpd",
    }


# ─────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────


@api_router.get("/health", tags=["Sistema"])
async def health_check():
    """Health check público."""
    return {"status": "ok", "version": "2.1.0"}


# ─────────────────────────────────────────────────────────────
# Registro do router
# ─────────────────────────────────────────────────────────────

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
