"""
Fábrica central de serviços.

Fornece funções para obter os singletons atuais.
Útil para testes, DI e para ter um ponto único de criação/override.
"""
from .ai_service import ai_service
from .google_docs_service import google_docs_service
from .whatsapp_service import whatsapp_service
from .pdf_service import pdf_service


def get_ai_service():
    return ai_service


def get_google_docs_service():
    return google_docs_service


def get_whatsapp_service():
    return whatsapp_service


def get_pdf_service():
    return pdf_service


__all__ = [
    "get_ai_service",
    "get_google_docs_service",
    "get_whatsapp_service",
    "get_pdf_service",
]
