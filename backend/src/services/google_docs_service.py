"""
Serviço Google Docs do sistema mvpdepsicologia.
"""

from typing import Optional

from utils.helpers import (
    extract_google_doc_id,
    build_google_doc_embed_url,
    build_google_doc_view_url,
)
from utils.logger import get_logger

logger = get_logger(__name__)


class GoogleDocsService:
    """
    Serviço para integração com Google Docs.
    """

    EMBED_HEIGHT_DEFAULT = 650
    EMBED_HEIGHT_FULL = 800

    def get_embed_url(self, doc_id: str) -> str:
        """Retorna a URL de preview/embed de um Google Doc."""
        return build_google_doc_embed_url(doc_id)

    def get_view_url(self, doc_id: str) -> str:
        """Retorna a URL pública de visualização."""
        return build_google_doc_view_url(doc_id)

    def extract_id_from_url(self, url_or_id: str) -> Optional[str]:
        """Extrai o DOC_ID de uma URL do Google Docs."""
        doc_id = extract_google_doc_id(url_or_id)

        if not doc_id:
            logger.warning(
                f"Não foi possível extrair DOC_ID de: '{url_or_id[:50]}'"
            )

        return doc_id

    def validate_doc_id(self, doc_id: str) -> bool:
        """Verifica se um DOC_ID tem formato válido."""
        import re

        return bool(
            doc_id and re.match(r"^[a-zA-Z0-9_-]{20,}$", doc_id)
        )


# Singleton global
google_docs_service = GoogleDocsService()