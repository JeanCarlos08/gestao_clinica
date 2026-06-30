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
]
