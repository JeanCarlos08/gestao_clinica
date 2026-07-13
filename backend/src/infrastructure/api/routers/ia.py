"""IA router — AI endpoints (parecer, diagnostics, chat).

Includes the Gemini-based clinical report generator, the diagnostics
endpoint and the sidebar chat assistant.
"""

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.config import settings
from core.repositories.repositories import atendimento_repo
from utils.logger import get_logger

from infrastructure.api.routers.deps import require_permission
from utils.constants import PERM_VIEW_DASHBOARD, PERM_VIEW_AUTOMACOES, PERM_TRIGGER_AUTOMACOES

logger = get_logger(__name__)

router = APIRouter(prefix="/api")


class IAPayload(BaseModel):
    notas: str
    modalidade: str = "Psicologia Clínica"


class IAChatPayload(BaseModel):
    pergunta: str = Field(..., min_length=1, max_length=1000)


@router.post("/ia/gerar-parecer", tags=["IA"])
async def gerar_parecer(payload: IAPayload, current_user: dict = Depends(require_permission(PERM_TRIGGER_AUTOMACOES))):
    """Gera um parecer clínico formal usando Google Gemini."""
    has_api_key = bool(settings.gemini_api_key)
    has_adc = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    if not has_api_key and not has_adc:
        logger.error("Gemini credenciais ausentes. GOOGLE_API_KEY/GEMINI_API_KEY ou GOOGLE_APPLICATION_CREDENTIALS não configurado.")
        raise HTTPException(
            status_code=503,
            detail=(
                "IA (Gemini) não configurada. Defina a variável de ambiente `GOOGLE_API_KEY` ou `GEMINI_API_KEY`, "
                "ou configure Application Default Credentials e aponte `GOOGLE_APPLICATION_CREDENTIALS` para o JSON da service account."
            ),
        )

    from services.ai_helpers import get_genai_or_none

    genai = get_genai_or_none(settings.gemini_api_key)
    if genai is None:
        logger.error("Gemini: nenhuma SDK disponível para GenAI.")
        raise HTTPException(status_code=503, detail="IA (Gemini) não disponível no servidor.")

    prompt = (
        f"Você é um psicólogo/psiquiatra experiente. Escreva um parágrafo formal e bem estruturado "
        f"de parecer clínico baseado nas anotações cruas abaixo. "
        f"A modalidade do atendimento é '{payload.modalidade}'. "
        f"Mantenha um tom profissional, técnico e objetivo, pronto para ir para um prontuário.\n\n"
        f"Anotações brutas:\n{payload.notas}"
    )

    last_error: Exception | None = None
    for model_name in settings.gemini_fallback_models:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if response and response.text:
                return {"texto": response.text.strip(), "model": model_name}
        except Exception as e:
            last_error = e
            logger.warning(f"Gemini modelo '{model_name}' falhou: {type(e).__name__}")

    logger.error(f"Erro no Gemini em todos os modelos: {last_error}")
    raise HTTPException(status_code=503, detail="Falha ao gerar texto com IA. Verifique permissões da API Key e modelo Gemini habilitado.")


@router.get("/ia/diagnostics", tags=["IA"])
async def ia_diagnostics(current_user: dict = Depends(require_permission(PERM_VIEW_AUTOMACOES))):
    """Endpoint seguro de diagnóstico para checar se IA/Google Docs estão configurados.

    Retorna apenas flags booleanas e metadados não sensíveis — NÃO expõe chaves ou JSONs.
    """
    has_api_key = bool(settings.gemini_api_key)
    has_adc = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

    google_creds_loadable = False
    try:
        from services.credentials_loader import load_credentials
        try:
            load_credentials()
            google_creds_loadable = True
        except Exception:
            google_creds_loadable = False
    except Exception:
        google_creds_loadable = False

    return {
        "has_ai": settings.has_ai,
        "gemini_key_set": has_api_key,
        "uses_adc": has_adc,
        "gemini_model": settings.gemini_model,
        "gemini_fallback_models": settings.gemini_fallback_models,
        "google_service_account_loadable": google_creds_loadable,
    }


@router.post("/ia/chat", tags=["IA"])
async def ia_chat(payload: IAChatPayload, current_user: dict = Depends(require_permission(PERM_VIEW_DASHBOARD))):
    """Chat da barra lateral: responde perguntas com base nos dados da clínica."""
    from services.ai_service import AIService
    from core.entities.models import AtendimentoFilter
    import json as _json

    stats = atendimento_repo.get_stats()
    atendimentos = atendimento_repo.list_all(filters=AtendimentoFilter(limit=200))
    context = {
        "stats": {
            "total_atendimentos": stats.total_atendimentos,
            "total_pacientes": stats.total_pacientes,
            "agendados": stats.agendados,
            "atendidos": stats.atendidos,
            "concluidos": stats.concluidos,
            "cancelados": stats.cancelados,
            "atendimentos_hoje": stats.atendimentos_hoje,
            "atendimentos_mes": stats.atendimentos_mes,
            "por_modalidade": stats.por_modalidade,
            "por_empresa": stats.por_empresa,
        },
        "atendimentos": [
            {
                "nome": a.nome,
                "empresa": a.empresa,
                "modalidade": a.modalidade,
                "data": a.data.strftime("%Y-%m-%d") if a.data else "",
                "status": a.status,
            }
            for a in atendimentos
        ],
    }

    resposta = AIService.chat_with_data(payload.pergunta, _json.dumps(context, ensure_ascii=False))
    return {"resposta": resposta}
