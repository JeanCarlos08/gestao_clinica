"""
Modelos de dados do sistema mvpdepsicologia.

Define as dataclasses tipadas que representam as entidades do banco.
São usadas em toda a aplicação como contratos de dados — evita dicts genéricos.

Não têm lógica de banco, apenas estrutura de dados + validação básica.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Optional


# ─────────────────────────────────────────────────────────────
# Atendimento
# ─────────────────────────────────────────────────────────────

@dataclass
class Atendimento:
    """
    Representa um atendimento clínico no sistema.
    Mapeado diretamente para a tabela `atendimentos`.
    """
    id: int
    empresa: str
    nome: str
    modalidade: str
    data: date
    hora: time
    status: str = "Agendado"
    observacoes: Optional[str] = None
    laudo_pdf: Optional[str] = None       # marcador "db:<id>" ou None
    avaliacao_pdf: Optional[str] = None   # marcador "db:<id>" ou None
    criado_em: Optional[datetime] = None

    @property
    def has_laudo(self) -> bool:
        """Retorna True se tem laudo PDF vinculado."""
        return bool(self.laudo_pdf)

    @property
    def has_avaliacao(self) -> bool:
        """Retorna True se tem avaliação PDF vinculada."""
        return bool(self.avaliacao_pdf)

    @property
    def laudo_file_id(self) -> Optional[int]:
        """Extrai o ID do arquivo de laudo (formato 'db:123')."""
        if self.laudo_pdf and self.laudo_pdf.startswith("db:"):
            try:
                return int(self.laudo_pdf.split(":", 1)[1])
            except (ValueError, IndexError):
                return None
        return None

    @property
    def avaliacao_file_id(self) -> Optional[int]:
        """Extrai o ID do arquivo de avaliação (formato 'db:123')."""
        if self.avaliacao_pdf and self.avaliacao_pdf.startswith("db:"):
            try:
                return int(self.avaliacao_pdf.split(":", 1)[1])
            except (ValueError, IndexError):
                return None
        return None


@dataclass
class AtendimentoCreate:
    """DTO para criação de novo atendimento."""
    empresa: str
    nome: str
    modalidade: str
    data: date
    hora: time
    status: str = "Agendado"
    observacoes: Optional[str] = None
    laudo_pdf: Optional[str] = None
    avaliacao_pdf: Optional[str] = None


@dataclass
class AtendimentoUpdate:
    """DTO para atualização parcial de atendimento. Apenas campos não-None são atualizados."""
    empresa: Optional[str] = None
    nome: Optional[str] = None
    modalidade: Optional[str] = None
    data: Optional[date] = None
    hora: Optional[time] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    laudo_pdf: Optional[str] = None
    avaliacao_pdf: Optional[str] = None

    def to_dict(self) -> dict:
        """Retorna apenas os campos com valor (para UPDATE dinâmico)."""
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class AtendimentoFilter:
    """Filtros para listagem de atendimentos."""
    empresa: Optional[str] = None
    nome: Optional[str] = None
    modalidade: Optional[str] = None
    status: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    limit: int = 500
    offset: int = 0


# ─────────────────────────────────────────────────────────────
# Arquivo (PDF no banco)
# ─────────────────────────────────────────────────────────────

@dataclass
class Arquivo:
    """Representa um arquivo PDF armazenado no banco."""
    id: int
    filename: str
    content_type: str
    size: int
    criado_em: Optional[datetime] = None
    content: Optional[bytes] = None  # Carregado apenas quando necessário

    @property
    def size_formatted(self) -> str:
        """Retorna o tamanho formatado (KB, MB)."""
        from utils.helpers import format_file_size
        return format_file_size(self.size)

    @property
    def marker(self) -> str:
        """Retorna o marcador no formato usado no banco (db:<id>)."""
        return f"db:{self.id}"


# ─────────────────────────────────────────────────────────────
# Nota
# ─────────────────────────────────────────────────────────────

@dataclass
class Nota:
    """Representa uma nota clínica/administrativa."""
    id: int
    titulo: str
    conteudo: Optional[str] = None
    tags: Optional[str] = None
    favorita: bool = False


@dataclass
class NotaCreate:
    """DTO para criação de nota."""
    titulo: str
    conteudo: Optional[str] = None
    tags: Optional[str] = None
    favorita: bool = False


# ─────────────────────────────────────────────────────────────
# Auditoria
# ─────────────────────────────────────────────────────────────

@dataclass
class AuditoriaEntry:
    """Representa uma entrada no log de auditoria."""
    id: int
    acao: str
    entidade: str
    entidade_id: Optional[int]
    detalhes: Optional[str]
    usuario: Optional[str]
    criado_em: Optional[datetime]


# ─────────────────────────────────────────────────────────────
# Documento (Google Docs)
# ─────────────────────────────────────────────────────────────

@dataclass
class Documento:
    """Representa um documento Google Docs vinculado ao sistema."""
    id: int
    titulo: str
    google_doc_id: str
    tipo: str = "template"   # template | laudo | relatorio | outro
    atendimento_id: Optional[int] = None
    criado_em: Optional[datetime] = None

    @property
    def embed_url(self) -> str:
        """URL de embed (preview) do Google Doc."""
        return f"https://docs.google.com/document/d/{self.google_doc_id}/preview"

    @property
    def view_url(self) -> str:
        """URL pública de visualização do Google Doc."""
        return f"https://docs.google.com/document/d/{self.google_doc_id}/view"


@dataclass
class DocumentoCreate:
    """DTO para vinculação de Google Doc."""
    titulo: str
    google_doc_id: str
    tipo: str = "template"
    atendimento_id: Optional[int] = None


# ─────────────────────────────────────────────────────────────
# Dashboard Stats
# ─────────────────────────────────────────────────────────────

@dataclass
class DashboardStats:
    """Estatísticas consolidadas para o dashboard."""
    total_atendimentos: int = 0
    total_pacientes: int = 0
    agendados: int = 0
    atendidos: int = 0
    concluidos: int = 0
    cancelados: int = 0
    total_empresas: int = 0
    atendimentos_hoje: int = 0
    atendimentos_mes: int = 0
    por_modalidade: dict = field(default_factory=dict)
    por_empresa: dict = field(default_factory=dict)
