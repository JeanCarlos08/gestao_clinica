"""
Helpers leves para inicialização/validação do cliente de IA.

Fornece uma função que tenta importar e configurar o módulo
`google.generativeai` e retorna o módulo configurado ou `None`.
Isso isola a lógica de import/config e facilita testes e fallback.
"""
from typing import Optional

from utils.logger import get_logger

logger = get_logger(__name__)


def get_genai_or_none(api_key: Optional[str]):
    """Tenta importar e configurar `google.generativeai`.

    Retorna o módulo `genai` se disponível e configurado, ou `None`.
    """
    if not api_key:
        logger.warning("AI: api_key não fornecida para inicialização do GenAI.")
        return None

    try:
        import google.generativeai as genai  # type: ignore
        try:
            genai.configure(api_key=api_key)
        except Exception as e:
            logger.warning(f"AI: falha ao configurar genai: {e}")
        return genai
    except ImportError:
        logger.error("AI: google-generativeai não instalado.")
        return None
    except Exception as e:
        logger.error(f"AI: erro inesperado ao importar genai: {e}")
        return None
