"""
Fábrica central de serviços.

Fornece funções para obter os singletons atuais ou criar novas instâncias.
Útil para testes, DI e para ter um ponto único de criação/override.
"""
from .ai_service import ai_service, create_ai_service
from .google_docs_service import google_docs_service, create_google_docs_service
from .whatsapp_service import whatsapp_service, create_whatsapp_service
from .pdf_service import pdf_service, create_pdf_service


def get_ai_service(use_singleton: bool = True):
    return ai_service if use_singleton else create_ai_service()


def get_google_docs_service(use_singleton: bool = True):
    return google_docs_service if use_singleton else create_google_docs_service()


def get_whatsapp_service(use_singleton: bool = True):
    return whatsapp_service if use_singleton else create_whatsapp_service()


def get_pdf_service(use_singleton: bool = True):
    return pdf_service if use_singleton else create_pdf_service()


__all__ = [
    "get_ai_service",
    "get_google_docs_service",
    "get_whatsapp_service",
    "get_pdf_service",
]
