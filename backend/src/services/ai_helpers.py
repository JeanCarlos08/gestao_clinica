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
    """Tenta importar e configurar um cliente GenAI compatível.

    Preferência por `google.genai` (nova SDK). Se não disponível, faz fallback
    para `google.generativeai` (legado). Retorna um módulo/adapter com a
    interface `configure(api_key)` e `GenerativeModel(model_name)` que expõe
    `generate_content(prompt)` compatível com o código existente.

    Se nada puder ser importado, retorna `None`.
    """
    # Tenta nova SDK: google.genai (exige `google-genai` no ambiente)
    try:
        from google import genai as new_genai  # type: ignore

        class _GenaiModel:
            def __init__(self, model_name: str, api_key: Optional[str] = None):
                self.model = model_name
                # A API do cliente pode variar entre versões; usamos o cliente global quando possível
                try:
                    # Algumas versões expõem um cliente de alto nível
                    self.client = new_genai.Client(api_key=api_key) if hasattr(new_genai, 'Client') else new_genai
                except Exception:
                    self.client = new_genai

            def generate_content(self, prompt):
                # Normaliza prompt para string
                if isinstance(prompt, list):
                    texts = []
                    for p in prompt:
                        if isinstance(p, dict):
                            continue
                        texts.append(str(p))
                    input_text = "\n\n".join(texts)
                else:
                    input_text = str(prompt)

                # Tentativas de chamadas suportadas pela nova SDK
                # Prefer generate_text(model=..., input=...)
                try:
                    # Nova SDK: use client.models.generate_content(model=..., contents=...)
                    if hasattr(self.client, 'models') and hasattr(self.client.models, 'generate_content'):
                        resp = self.client.models.generate_content(model=self.model, contents=input_text)
                        text = getattr(resp, 'text', None)
                        if not text and hasattr(resp, 'candidates'):
                            c = getattr(resp, 'candidates')
                            if c and len(c) > 0:
                                text = getattr(c[0], 'text', None) or getattr(c[0], 'content', None)
                        if not text and hasattr(resp, 'output'):
                            out = getattr(resp, 'output')
                            if out and len(out) > 0:
                                text = getattr(out[0], 'text', None) or getattr(out[0], 'content', None)
                        if not text and hasattr(resp, 'content'):
                            text = getattr(resp, 'content')
                        if text is not None and not isinstance(text, str):
                            try:
                                text = str(text)
                            except Exception:
                                text = None
                        return type('R', (), {'text': text})

                    # Fallbacks for other shapes (kept for compatibility)
                    if hasattr(self.client, 'generate_text'):
                        resp = self.client.generate_text(model=self.model, input=input_text)
                        text = getattr(resp, 'text', None)
                        if text is not None and not isinstance(text, str):
                            try:
                                text = str(text)
                            except Exception:
                                text = None
                        return type('R', (), {'text': text})
                except Exception as e:
                    err = str(e)
                    if 'API_KEY_INVALID' in err or 'API key not valid' in err:
                        logger.error("AI: chave da API Gemini inválida. Verifique GOOGLE_API_KEY em backend/.env")
                    else:
                        logger.warning(f"AI: erro na chamada Gemini ({self.model}): {type(e).__name__}: {e}")
                    return type('R', (), {'text': None})

                # Se nada funcionar, retorna None-text para sinalizar falha
                return type('R', (), {'text': None})

        class _GenaiAdapter:
            def __init__(self, api_key: Optional[str] = None):
                self._api_key = api_key

            def configure(self, api_key: Optional[str]):
                self._api_key = api_key

            def GenerativeModel(self, model_name: str):
                return _GenaiModel(model_name, api_key=self._api_key)

        logger.info('AI: usando google.genai (nova SDK)')
        return _GenaiAdapter(api_key=api_key)
    except Exception as e:
        logger.warning(f"AI: google.genai indisponível ou falha ao inicializar: {e} — tentando SDK legado.")
        # Fallback para SDK legado quando disponível
        try:
            import google.generativeai as genai  # type: ignore
            try:
                if api_key:
                    genai.configure(api_key=api_key)
            except Exception as e2:
                logger.warning(f"AI: falha ao configurar genai legado: {e2}")
            logger.info("AI: usando google.generativeai (SDK legado) como fallback.")
            return genai
        except Exception as e3:
            logger.error(f"AI: nenhuma SDK GenAI disponível: {e3}")
            return None
