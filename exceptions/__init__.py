"""Pacote de exceções customizadas do sistema mvpdepsicologia."""
from .custom_exceptions import (
    DatabaseError,
    ConnectionError,
    RecordNotFoundError,
    DuplicateRecordError,
    ServiceUnavailableError,
    ValidationError,
    AuthenticationError,
    FileSizeLimitError,
    InvalidFileTypeError,
    N8NWebhookError,
)

__all__ = [
    "DatabaseError",
    "ConnectionError",
    "RecordNotFoundError",
    "DuplicateRecordError",
    "ServiceUnavailableError",
    "ValidationError",
    "AuthenticationError",
    "FileSizeLimitError",
    "InvalidFileTypeError",
    "N8NWebhookError",
]
