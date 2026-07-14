"""LGPD router — all LGPD compliance endpoints.

Consent registration/revocation, data portability, right-to-be-forgotten,
public LGPD info, ROPA, DPO configuration and history.
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from services.lgpd_service import get_lgpd_service
from infrastructure.api.routers.deps import _get_client_ip, get_current_user, run_sync
from infrastructure.api.limiter import limiter

router = APIRouter(prefix="/api")


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


class DPOUpdatePayload(BaseModel):
    dpo_nome: Optional[str] = None
    dpo_email: Optional[str] = None
    dpo_telefone: Optional[str] = None
    empresa_nome: Optional[str] = None
    empresa_cnpj: Optional[str] = None
    empresa_endereco: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Consentimento
# ─────────────────────────────────────────────────────────────


@router.post(
    "/lgpd/consentimentos",
    response_model=ConsentimentoResponse,
    tags=["LGPD"],
    summary="Registrar consentimento do titular (LGPD Art. 8º)",
)
@limiter.limit("30/minute")
async def registrar_consentimento(request: Request, body: ConsentimentoCreate):
    """
    Registra o consentimento do titular para tratamento de dados pessoais.
    Armazena data/hora, IP, finalidade e base legal conforme exigido pela LGPD.
    """
    lgpd = get_lgpd_service()
    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    resultado = await run_sync(lgpd.registrar_consentimento,
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


@router.get(
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
    registros = await run_sync(lgpd.buscar_consentimentos, email)
    return {"email": email, "total": len(registros), "consentimentos": registros}


@router.delete(
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
    return await run_sync(lgpd.revogar_consentimento, email)


# ─────────────────────────────────────────────────────────────
# LGPD Endpoints — Direitos do Titular
# ─────────────────────────────────────────────────────────────


@router.get(
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
    return await run_sync(lgpd.exportar_dados_titular, email=email, nome=nome)


@router.post(
    "/lgpd/titulares/esquecimento",
    response_model=EsquecimentoResponse,
    tags=["LGPD"],
    summary="Direito ao esquecimento / eliminação (Art. 18, VI)",
)
@limiter.limit("5/minute")
async def executar_esquecimento(
    request: Request,
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
    return await run_sync(lgpd.executar_esquecimento, email=body.email, nome=body.nome)


# ─────────────────────────────────────────────────────────────
# LGPD Info Pública (sem autenticação)
# ─────────────────────────────────────────────────────────────


@router.get(
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
        "dpo": await run_sync(lgpd.info_dpo),
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


@router.get(
    "/lgpd/ropa",
    tags=["LGPD"],
    summary="ROPA — Registro de Atividades de Tratamento (Art. 37)",
)
async def get_ropa(current_user: dict = Depends(get_current_user)):
    """Gera o Registro de Atividades de Tratamento dinamicamente."""
    lgpd = get_lgpd_service()
    return await run_sync(lgpd.gerar_ropa)


@router.get(
    "/lgpd/dpo",
    tags=["LGPD"],
    summary="Consultar configuração do DPO",
)
async def get_dpo_config(current_user: dict = Depends(get_current_user)):
    lgpd = get_lgpd_service()
    return await run_sync(lgpd.info_dpo)


@router.put(
    "/lgpd/dpo",
    tags=["LGPD"],
    summary="Atualizar dados do DPO (admin)",
)
async def update_dpo_config(body: DPOUpdatePayload, current_user: dict = Depends(get_current_user)):
    """Atualiza os dados do DPO (Encarregado de Dados)."""
    lgpd = get_lgpd_service()
    dados = {k: v for k, v in body.model_dump().items() if v is not None}
    if not dados:
        raise HTTPException(status_code=400, detail="Nenhum campo informado.")
    ok = await run_sync(lgpd.atualizar_dpo, dados)
    return {"sucesso": ok, "atualizados": list(dados.keys())}


@router.get(
    "/lgpd/esquecimentos",
    tags=["LGPD"],
    summary="Histórico de esquecimentos executados (sem PII)",
)
async def historico_esquecimentos(limit: int = 100, current_user: dict = Depends(get_current_user)):
    """Lista todos os esquecimentos executados. Não contém PII — apenas hashes."""
    lgpd = get_lgpd_service()
    return {"total": limit, "registros": await run_sync(lgpd.historico_esquecimentos, limit=limit)}
