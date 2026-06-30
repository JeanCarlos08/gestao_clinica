"""
Exceções customizadas do sistema mvpdepsicologia.

Define uma hierarquia clara de erros para facilitar tratamento específico
em cada camada (UI, service, repositório) sem expor detalhes internos.
"""


# ─────────────────────────────────────────────────────────────
# Base
# ─────────────────────────────────────────────────────────────

class AppBaseError(Exception):
    """Exceção base do sistema. Toda exceção customizada herda desta."""

    def __init__(self, message: str, details: str | None = None) -> None:
        self.message = message
        self.details = details
        super().__init__(message)

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} | Detalhes: {self.details}"
        return self.message


# ─────────────────────────────────────────────────────────────
# Banco de Dados
# ─────────────────────────────────────────────────────────────

class DatabaseError(AppBaseError):
    """Erro genérico de banco de dados."""


class ConnectionError(DatabaseError):
    """Falha ao conectar ao PostgreSQL."""


class RecordNotFoundError(DatabaseError):
    """Registro não encontrado no banco."""

    def __init__(self, entity: str, entity_id: int | str) -> None:
        super().__init__(
            message=f"Registro não encontrado: {entity} #{entity_id}",
            details=f"Tabela: {entity}, ID: {entity_id}",
        )
        self.entity = entity
        self.entity_id = entity_id


class DuplicateRecordError(DatabaseError):
    """Tentativa de inserir registro duplicado (violação de UNIQUE constraint)."""

    def __init__(self, entity: str, field: str) -> None:
        super().__init__(
            message=f"Registro duplicado em {entity}: campo '{field}' já existe.",
        )


# ─────────────────────────────────────────────────────────────
# Serviços Externos
# ─────────────────────────────────────────────────────────────

class ServiceUnavailableError(AppBaseError):
    """Serviço externo indisponível (Gemini, Google Docs, etc.)."""

    def __init__(self, service_name: str, reason: str | None = None) -> None:
        super().__init__(
            message=f"Serviço '{service_name}' indisponível no momento.",
            details=reason,
        )
        self.service_name = service_name


# ─────────────────────────────────────────────────────────────
# Validação
# ─────────────────────────────────────────────────────────────

class ValidationError(AppBaseError):
    """Dado de entrada inválido (formulário, payload, etc.)."""

    def __init__(self, field: str, reason: str) -> None:
        super().__init__(
            message=f"Campo inválido: '{field}' — {reason}",
        )
        self.field = field
        self.reason = reason


# ─────────────────────────────────────────────────────────────
# Autenticação
# ─────────────────────────────────────────────────────────────

class AuthenticationError(AppBaseError):
    """Credenciais inválidas ou sessão expirada."""

    def __init__(self, reason: str = "Credenciais inválidas.") -> None:
        super().__init__(message=reason)


# ─────────────────────────────────────────────────────────────
# Arquivos / Upload
# ─────────────────────────────────────────────────────────────

class FileSizeLimitError(AppBaseError):
    """Arquivo excede o tamanho máximo permitido."""

    def __init__(self, filename: str, max_mb: int = 50) -> None:
        super().__init__(
            message=f"O arquivo '{filename}' excede o limite de {max_mb}MB.",
        )
        self.filename = filename
        self.max_mb = max_mb


class InvalidFileTypeError(AppBaseError):
    """Tipo de arquivo não permitido."""

    def __init__(self, filename: str, allowed_types: list[str]) -> None:
        super().__init__(
            message=f"Tipo de arquivo não permitido: '{filename}'. Permitidos: {', '.join(allowed_types)}",
        )
        self.filename = filename
        self.allowed_types = allowed_types
