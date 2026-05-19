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


class LaudoService:
    """Serviço para gerar laudos psicossociais via Google Docs."""

    def __init__(self):
        """Inicializa o serviço."""
        self.api = get_google_docs_api()
        self.template_id = self._get_template_id()

    def _get_template_id(self) -> str:
        """Obtém o ID do template do Google Docs."""
        from config import settings

        template_id = getattr(settings, "GOOGLE_DOCS_TEMPLATE_ID", None)

        if not template_id:
            raise ValueError(
                "GOOGLE_DOCS_TEMPLATE_ID não configurado em .env\n"
                "Cole o ID do documento template aqui."
            )

        return template_id

    def gerar_laudo(
        self,
        dados: DadosLaudo,
        titulo_customizado: Optional[str] = None,
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
            titulo = titulo_customizado or f"Laudo - {dados.nome_paciente}"
            novo_doc = self.api.copy_document(self.template_id, titulo)

            # 2. Preencher campos
            replacements = self._montar_replacements(dados)
            self.api.replace_text(novo_doc["id"], replacements)

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

        return {
            # Identificação
            "{{NOME}}": dados.nome_paciente,
            "{{DATA_NASCIMENTO}}": dados.data_nascimento,
            "{{CPFFF}}": dados.cpf,
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
