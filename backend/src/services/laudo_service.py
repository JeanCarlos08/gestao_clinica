"""
Serviço de Geração de Laudos Psicossociais

Integra dados do atendimento com templates Google Docs
para gerar laudos automaticamente.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

from services.google_docs_api import get_google_docs_api
from utils.logger import get_logger
from utils.audit import log_event

logger = get_logger(__name__)


@dataclass
class DadosLaudo:
    """Dados estruturados para preenchimento do laudo."""

    # Identificação
    nome_paciente: str
    data_nascimento: str  # DD/MM/YYYY
    cpf: str
    empresa: str

    # Avaliação
    data_exame: str  # DD/MM/YYYY
    motivo_avaliacao: str

    # Checkbox fields
    avaliacao_psicologica: bool = False
    admissional: bool = False
    periodica: bool = False
    pessoal: bool = False
    mudanca_funcao: bool = False

    # Itens auxiliares
    itens_auxiliados: str = ""

    # Conclusão
    conclusao: str = ""

    # Metadados
    psicologista_nome: str = "Dr. Psicólogo"
    psicologista_crp: str = "XX/XXXXX"


def resolve_template_id(template_override: Optional[str] = None) -> str:
    """Resolve o ID do template: parâmetro > config da clínica > .env."""
    from core.config import settings
    from core.repositories.user_repositories import clinic_config_repo
    from services.google_docs_service import google_docs_service
    from utils.constants import CLINIC_PREF_GOOGLE_DOC_ID

    if template_override:
        doc_id = google_docs_service.extract_id_from_url(template_override) or template_override
        if doc_id and google_docs_service.validate_doc_id(doc_id):
            return doc_id

    clinic_doc = clinic_config_repo.get(CLINIC_PREF_GOOGLE_DOC_ID, "")
    if clinic_doc:
        doc_id = google_docs_service.extract_id_from_url(clinic_doc) or clinic_doc
        if doc_id and google_docs_service.validate_doc_id(doc_id):
            return doc_id

    env_id = settings.google_docs_template_id
    if env_id:
        doc_id = google_docs_service.extract_id_from_url(env_id) or env_id
        if doc_id:
            return doc_id

    raise ValueError(
        "Template do Google Docs não configurado. "
        "Configure em Configurações > Integrações ou defina GOOGLE_DOCS_TEMPLATE_ID no .env."
    )


class LaudoService:
    """Serviço para gerar laudos psicossociais via Google Docs."""

    def __init__(self):
        """Inicializa o serviço."""
        self._api = None

    @property
    def api(self):
        if self._api is None:
            self._api = get_google_docs_api()
        return self._api

    @property
    def template_id(self) -> str:
        """ID do template ativo (clínica ou .env)."""
        return resolve_template_id()

    def gerar_laudo(
        self,
        dados: DadosLaudo,
        titulo_customizado: Optional[str] = None,
        template_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gera um novo laudo a partir do template.

        Args:
            dados: DadosLaudo com informações do paciente
            titulo_customizado: Título customizado (padrão: "Laudo - Nome")

        Returns:
            Dict com ID e URL do novo documento
        """
        try:
            # 1. Copiar template
            active_template = resolve_template_id(template_id)
            titulo = titulo_customizado or f"Laudo - {dados.nome_paciente}"
            novo_doc = self.api.copy_document(active_template, titulo)

            # 2. Preencher campos
            replacements = self._montar_replacements(dados)
            self.api.replace_text(novo_doc["id"], replacements)

            try:
                self.api.make_viewable_by_link(novo_doc["id"])
            except Exception:
                logger.warning("Documento gerado, mas embed pode exigir permissões manuais.")

            logger.info(
                f"✓ Laudo gerado para {dados.nome_paciente}: {novo_doc['url']}"
            )

            # Auditoria: registrar criação do laudo (dados minimizados)
            try:
                log_event("laudo_criado", {
                    "cpf_hash": dados.cpf[-6:],
                    "nome_trunc": dados.nome_paciente.split()[0],
                    "doc_id": novo_doc["id"],
                    "url": novo_doc.get("url"),
                })
            except Exception:
                logger.exception("Falha ao gravar auditoria de laudo")

            return novo_doc

        except Exception as e:
            logger.error(f"✗ Erro ao gerar laudo: {e}")
            raise

    def _montar_replacements(self, dados: DadosLaudo) -> Dict[str, str]:
        """Monta o dicionário de substituições para o template."""

        # Indicadores de checkbox
        checkboxes = {
            "{{CHECKBOX_PSICOLOGICA}}": "☑" if dados.avaliacao_psicologica else "☐",
            "{{CHECKBOX_ADMISSIONAL}}": "☑" if dados.admissional else "☐",
            "{{CHECKBOX_PERIODICA}}": "☑" if dados.periodica else "☐",
            "{{CHECKBOX_PESSOAL}}": "☑" if dados.pessoal else "☐",
            "{{CHECKBOX_MUDANCA}}": "☑" if dados.mudanca_funcao else "☐",
        }

        cpf_val = dados.cpf
        return {
            # Identificação
            "{{NOME}}": dados.nome_paciente,
            "{{DATA_NASCIMENTO}}": dados.data_nascimento,
            "{{CPF}}": cpf_val,
            "{{CPFFF}}": cpf_val,
            "{{EMPRESA}}": dados.empresa,
            # Avaliação
            "{{DATA_EXAME}}": dados.data_exame,
            "{{MOTIVO_AVALIACAO}}": dados.motivo_avaliacao,
            # Checkboxes
            **checkboxes,
            # Conteúdo
            "{{ITENS_AUXILIADOS}}": dados.itens_auxiliados,
            "{{CONCLUSAO}}": dados.conclusao,
            # Profissional
            "{{PSICOLOGISTA_NOME}}": dados.psicologista_nome,
            "{{PSICOLOGISTA_CRP}}": dados.psicologista_crp,
            "{{DATA_GERACAO}}": datetime.now().strftime("%d/%m/%Y"),
        }

    def gerar_e_exportar_pdf(
        self,
        dados: DadosLaudo,
        caminho_pdf: str,
        titulo_customizado: Optional[str] = None,
    ) -> str:
        """
        Gera laudo e exporta como PDF.

        Args:
            dados: Dados do laudo
            caminho_pdf: Caminho para salvar o PDF
            titulo_customizado: Título customizado

        Returns:
            Caminho do PDF gerado
        """
        # Gerar laudo
        novo_doc = self.gerar_laudo(dados, titulo_customizado)

        # Exportar como PDF
        pdf_path = self.api.export_as_pdf(novo_doc["id"], caminho_pdf)

        # Deletar documento temporário (opcional)
        # self.api.delete_document(novo_doc["id"])

        # Auditoria: exportação de PDF
        try:
            log_event("laudo_exportado_pdf", {
                "doc_id": novo_doc["id"],
                "pdf_path": caminho_pdf,
            })
        except Exception:
            logger.exception("Falha ao gravar auditoria de exportacao")

        return pdf_path

    def compartilhar_com_paciente(
        self, doc_id: str, email_paciente: str
    ) -> None:
        """
        Compartilha o laudo com o paciente.

        Args:
            doc_id: ID do documento
            email_paciente: Email do paciente
        """
        self.api.share_document(doc_id, email_paciente, role="viewer")
        logger.info(f"✓ Laudo compartilhado com {email_paciente}")
        try:
            log_event("laudo_compartilhado", {"doc_id": doc_id, "email": email_paciente})
        except Exception:
            logger.exception("Falha ao gravar auditoria de compartilhamento")


# Instância global
_laudo_service: Optional[LaudoService] = None


def get_laudo_service() -> LaudoService:
    """Retorna instância singleton do serviço de laudos."""
    global _laudo_service
    if _laudo_service is None:
        _laudo_service = LaudoService()
    return _laudo_service
