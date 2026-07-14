"""
Serviço de IA do sistema mvpdepsicologia.

Refatoração do ai_manager.py original com:
- Integração com o config.py centralizado
- Logs estruturados via utils.logger
- Mesma interface de métodos (compatibilidade)
- Melhor tratamento de erros e fallback de modelos

Funcionalidades:
- analyze_pdf_content(): Resumo clínico de PDFs via Gemini
- generate_clinical_draft(): Geração de parecer clínico formal
- generate_dashboard_insights(): Insights de negócio
- validate_clinical_pdf(): Validação de documento clínico
- chat_with_data(): Chat inteligente com contexto dos dados

Uso:
    from services.ai_service import ai_service
    result = ai_service.analyze_pdf_content(pdf_bytes, "laudo.pdf")
"""

from typing import Optional

from core.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class AIService:
    """
    Serviço de Inteligência Artificial via Google Gemini.
    Implementa sistema de fallback entre modelos disponíveis.
    """

    _model = None
    _initialized = False

    @classmethod
    def _initialize(cls) -> tuple[bool, str]:
        """
        Inicializa o modelo Gemini com fallback automático.
        Testa candidatos em ordem de preferência.
        Retorna (True, "OK") em sucesso ou (False, "Razão da falha") em erro.
        """
        if cls._model is not None:
            return True, "OK"

        if not settings.has_ai:
            msg = "AI: Chave da API não configurada (GOOGLE_API_KEY)."
            logger.warning(msg)
            return False, "A chave da API de IA (GOOGLE_API_KEY) não foi configurada no servidor."

        try:
            from services.ai_helpers import get_genai_or_none
            genai = get_genai_or_none(settings.gemini_api_key)
            if genai is None:
                logger.error("AI: nenhuma SDK GenAI disponível (google.genai).")
                return False, "A biblioteca de IA do Google (`google-genai`) não está instalada no servidor."
        except Exception as e:
            logger.error(f"AI: erro ao inicializar cliente GenAI: {e}")
            return False, "Ocorreu um erro inesperado ao inicializar o serviço de IA."

        candidates = settings.gemini_fallback_models
        last_error: str = ""

        # Tenta inicializar modelos com o cliente obtido (adapter `google.genai`)
        for model_name in candidates:
            try:
                model = genai.GenerativeModel(model_name)
                # Teste rápido para verificar se o modelo realmente gera texto
                try:
                    test_resp = None
                    try:
                        test_resp = model.generate_content('Teste rápido: diga OK em uma palavra')
                    except Exception as e:
                        err_str = str(e)
                        if 'RESOURCE_EXHAUSTED' in err_str or '429' in err_str:
                            last_error = f"Quota da API Gemini esgotada. Verifique seu plano em https://ai.dev/rate-limit"
                            logger.warning(f"AI: Quota esgotada para modelo '{model_name}'")
                        elif 'NOT_FOUND' in err_str:
                            last_error = f"Modelo '{model_name}' não encontrado ou descontinuado."
                            logger.warning(f"AI: Modelo '{model_name}' não encontrado")
                        else:
                            last_error = f"Erro ao chamar modelo '{model_name}': {type(e).__name__}"
                            logger.warning(f"AI: Erro ao testar modelo '{model_name}': {type(e).__name__}")
                        test_resp = None

                    text = getattr(test_resp, 'text', None) if test_resp is not None else None
                    if text and str(text).strip():
                        cls._model = model
                        logger.info(f"AI: Modelo '{model_name}' inicializado com sucesso.")
                        return True, "OK"
                    else:
                        if not last_error:
                            last_error = f"Modelo '{model_name}' não retornou texto válido."
                        logger.warning(f"AI: Modelo '{model_name}' não retornou texto válido. Tentando próximo.")
                        continue
                except Exception as e:
                    last_error = f"Erro ao testar modelo '{model_name}': {type(e).__name__}"
                    logger.warning(f"AI: Erro ao testar modelo '{model_name}': {type(e).__name__}")
                    continue
            except Exception as e:
                last_error = f"Modelo '{model_name}' indisponível: {type(e).__name__}"
                logger.warning(f"AI: Modelo '{model_name}' indisponível: {type(e).__name__}")
                continue

        # Não há fallback legado — se nenhum modelo funcionou, falhamos explicitamente

        msg = f"AI: Nenhum modelo Gemini disponível. Último erro: {last_error}"
        logger.error(msg)
        return False, last_error or "Nenhum modelo de IA está disponível ou funcionando."

    @classmethod
    def analyze_pdf_content(cls, file_content: bytes, filename: str) -> str:
        """
        Analisa o conteúdo de um PDF usando Gemini e retorna um resumo clínico.

        Args:
            file_content: Bytes do arquivo PDF.
            filename: Nome do arquivo (para contexto no prompt).

        Returns:
            Resumo clínico em texto Markdown ou mensagem de erro.
        """
        is_ready, reason = cls._initialize()
        if not is_ready:
            return f"❌ IA indisponível: {reason}"

        try:
            prompt = f"""
            Você é um assistente especializado em gestão clínica de psicologia e medicina do trabalho.
            Analise o conteúdo deste arquivo PDF ({filename}) e forneça um resumo executivo:

            1. **Pontos principais** do laudo/avaliação.
            2. **Recomendações ou conclusões** principais.
            3. **Dados críticos** que merecem atenção.

            Seja conciso e profissional. Se não conseguir ler os dados, informe.
            Responda em Português do Brasil, em formato Markdown.
            """

            response = cls._model.generate_content([
                prompt,
                {"mime_type": "application/pdf", "data": file_content},
            ])

            return response.text if response and response.text else "A IA não retornou uma resposta válida."

        except Exception as e:
            logger.error(f"AI: Erro na análise de PDF '{filename}': {type(e).__name__}")
            return "Não foi possível analisar o documento no momento. Tente novamente em instantes."

    @classmethod
    def generate_clinical_draft(
        cls,
        nome: str,
        empresa: str,
        modalidade: str,
        observacoes: str,
    ) -> str:
        """
        Gera um rascunho de parecer clínico formal.

        Args:
            nome: Nome do paciente.
            empresa: Empresa do paciente.
            modalidade: Tipo de avaliação (Admissional, Periódico, etc.).
            observacoes: Anotações brutas do profissional.

        Returns:
            Parecer clínico formatado em Markdown.
        """
        is_ready, reason = cls._initialize()
        if not is_ready:
            return f"❌ IA indisponível: {reason}"

        try:
            prompt = f"""
            Você é um assistente de psicólogos e médicos do trabalho.
            Transforme as breves notas abaixo em um parecer clínico profissional e formal,
            com vocabulário técnico, pronto para ser assinado.

            **Dados do Atendimento:**
            - Paciente: {nome}
            - Empresa: {empresa}
            - Tipo de Avaliação: {modalidade}

            **Anotações da Profissional (Rascunho):**
            "{observacoes}"

            **Regras:**
            - Comece com cabeçalho formal: "PARECER TÉCNICO / CLÍNICO"
            - Desenvolva as anotações em parágrafos coesos e bem estruturados.
            - Use linguagem técnica e formal.
            - Termine com espaço para "Data" e "Assinatura do Profissional".
            - Retorne em Português do Brasil, formatado em Markdown limpo.
            """

            response = cls._model.generate_content(prompt)
            return response.text if response and response.text else "Falha ao gerar o parecer."

        except Exception as e:
            logger.error(f"AI: Erro na geração de parecer clínico: {type(e).__name__}")
            return "Não foi possível gerar o parecer no momento. Verifique sua conexão e tente novamente."

    @classmethod
    def generate_dashboard_insights(cls, stats_json: str) -> str:
        """
        Gera insights de negócio baseados nas estatísticas do dashboard.

        Args:
            stats_json: JSON string com estatísticas consolidadas.

        Returns:
            Dicas em formato Markdown com emojis.
        """
        is_ready, reason = cls._initialize()
        if not is_ready:
            return f"💡 IA indisponível: {reason}"

        try:
            prompt = f"""
            Você é uma consultora estratégica de clínica médica especializada em análise de dados operacionais (Business Intelligence).
            Baseado neste JSON com estatísticas consolidadas da clínica: {stats_json}

            Sua tarefa é fornecer insights valiosos para a gestão.
            
            Retorne DUAS ou TRÊS dicas curtas, diretas e acionáveis (usando bullet points com emojis).
            - Foque em tendências (ex: modalidade dominante, gargalos de atendimentos pendentes).
            - Sugira ações preventivas ou de otimização.
            - Seja encorajadora e profissional.
            - Se os dados estiverem baixos: "A base de dados é pequena. Continue cadastrando atendimentos para gerar análises preditivas!".
            
            Responda em Português do Brasil, formatado em Markdown limpo.
            """

            response = cls._model.generate_content(prompt)
            return response.text if response and response.text else "Cadastre mais atendimentos para obter insights."

        except Exception as e:
            logger.warning(f"AI: Falha nos insights do dashboard: {type(e).__name__}")
            return "Não foi possível gerar os insights agora."

    @classmethod
    def validate_clinical_pdf(cls, file_content: bytes) -> tuple[bool, str]:
        """
        Verifica se o PDF é um documento clínico válido (não lixo/spam).

        Args:
            file_content: Bytes do arquivo (máx 500KB para velocidade).

        Returns:
            Tuple (is_valid: bool, error_message: str)
        """
        is_ready, _ = cls._initialize()
        if not is_ready:
            return True, ""  # Em modo degradado, não bloqueia

        try:
            prompt = """
            Você é um classificador de segurança de dados.
            Analise este PDF e responda APENAS com "VALIDO" ou "INVALIDO".

            VALIDO: documento médico, psicológico, laudo, atestado, receita, ficha de RH, anamnese, formulário clínico.
            INVALIDO: conta de luz, cupom fiscal, foto, documento de veículo, qualquer coisa não clínica.
            """

            response = cls._model.generate_content([
                prompt,
                {"mime_type": "application/pdf", "data": file_content[:500_000]},
            ])

            result = (response.text or "").strip().upper()
            if "INVALIDO" in result:
                return False, "A IA detectou que este arquivo não parece ser um documento clínico válido."
            return True, ""

        except Exception:
            return True, ""  # Em falha, sempre permite (não bloqueia o usuário)

    @classmethod
    def chat_with_data(cls, query: str, context_df_json: str) -> str:
        """
        Chat inteligente com contexto dos dados do sistema.

        Args:
            query: Pergunta do usuário.
            context_df_json: JSON string com dados dos atendimentos.

        Returns:
            Resposta da IA em Markdown.
        """
        is_ready, reason = cls._initialize()
        if not is_ready:
            return f"❌ IA indisponível: {reason}"

        try:
            prompt = f"""
            Você é a 'IA Assistente', assistente de gestão clínica.
            Com base nos dados abaixo (JSON), responda à pergunta do usuário.

            Dados atuais:
            {context_df_json}

            Pergunta: {query}

            Seja prestativa, use tabelas Markdown se necessário.
            Cite nomes ou empresas se presentes nos dados.
            Responda em Português do Brasil.
            """

            response = cls._model.generate_content(prompt)
            return response.text if response and response.text else "Não obtive resposta da IA."

        except Exception as e:
            logger.error(f"AI: Erro no chat: {type(e).__name__}")
            return "Não foi possível processar sua pergunta no momento. Tente novamente."

    @property
    def is_available(self) -> bool:
        """Retorna True se a IA está configurada e disponível."""
        is_ready, _ = self._initialize()
        return is_ready


# Singleton global
ai_service = AIService()
