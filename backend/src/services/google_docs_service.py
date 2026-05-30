"""
Serviço Google Docs do sistema mvpdepsicologia.

Fase 1 (atual):
- Gerencia documentos Google Docs públicos via embed/iframe
- Valida e extrai IDs de URLs do Google Docs
- Renderiza documentos diretamente no Streamlit

Fase 2 (futuro):
- Google Docs API + Service Account
- Criação programática de laudos
- Preenchimento automático de templates

Configuração necessária (Fase 1):
- O documento Google deve ser compartilhado como "Qualquer pessoa com o link pode VER"
- Copie o link de compartilhamento e cole na interface
- O sistema extrai automaticamente o DOC_ID da URL

Limitações do embed via iframe:
- Requer documento público (ou com permissão de visualização)
- Não é possível editar via iframe
- Alguns navegadores bloqueiam iframes de terceiros (usar botão "Abrir no Google Docs")

Uso:
    from services.google_docs_service import google_docs_service
    google_docs_service.render_embedded(doc_id, height=600)
"""

from typing import Optional

import streamlit as st
import streamlit.components.v1 as components

from core.config import settings
from utils.helpers import extract_google_doc_id, build_google_doc_embed_url, build_google_doc_view_url
from utils.logger import get_logger

logger = get_logger(__name__)


class GoogleDocsService:
    """
    Serviço para integração com Google Docs via embed/iframe.

    Fase 1: Documentos públicos (compartilhamento "qualquer pessoa com o link").
    Fase 2 (futuro): Google Docs API com Service Account.
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
        """
        Extrai o DOC_ID de uma URL do Google Docs ou retorna o ID direto.

        Args:
            url_or_id: URL completa do Google Docs ou o ID direto.

        Returns:
            DOC_ID string ou None se inválido.
        """
        doc_id = extract_google_doc_id(url_or_id)
        if not doc_id:
            logger.warning(f"Não foi possível extrair DOC_ID de: '{url_or_id[:50]}'")
        return doc_id

    def render_embedded(
        self,
        doc_id: str,
        height: int = EMBED_HEIGHT_DEFAULT,
        show_open_button: bool = True,
    ) -> None:
        """
        Renderiza um Google Doc embedado via iframe no Streamlit.

        Args:
            doc_id: ID do Google Doc.
            height: Altura do iframe em pixels.
            show_open_button: Se True, exibe botão para abrir no Google Docs.
        """
        embed_url = self.get_embed_url(doc_id)
        view_url = self.get_view_url(doc_id)

        if show_open_button:
            col1, col2 = st.columns([4, 1])
            with col2:
                st.link_button(
                    "↗ Abrir no Google Docs",
                    url=view_url,
                    use_container_width=True,
                )

        # Iframe responsivo com borda sutil
        iframe_html = f"""
        <div style="
            border: 1px solid #334155;
            border-radius: 8px;
            overflow: hidden;
            background: #1e293b;
        ">
            <iframe
                src="{embed_url}"
                width="100%"
                height="{height}px"
                frameborder="0"
                style="display:block;"
                loading="lazy"
                allow="autoplay"
            ></iframe>
        </div>
        """
        components.html(iframe_html, height=height + 20, scrolling=False)
        logger.info(f"Google Doc embedado: DOC_ID={doc_id}")

    def render_from_url(
        self,
        url_or_id: str,
        height: int = EMBED_HEIGHT_DEFAULT,
    ) -> bool:
        """
        Recebe uma URL ou ID e renderiza o documento embedado.

        Returns:
            True se foi possível renderizar, False caso contrário.
        """
        doc_id = self.extract_id_from_url(url_or_id)
        if not doc_id:
            st.error(
                "❌ URL inválida. Certifique-se de usar uma URL do Google Docs no formato:\n"
                "`https://docs.google.com/document/d/DOCUMENT_ID/edit`"
            )
            return False

        self.render_embedded(doc_id, height)
        return True

    def validate_doc_id(self, doc_id: str) -> bool:
        """Verifica se um DOC_ID tem o formato correto."""
        import re
        return bool(doc_id and re.match(r"^[a-zA-Z0-9_-]{20,}$", doc_id))

    def render_instructions(self) -> None:
        """Renderiza instruções de configuração do Google Docs (para a página de documentos)."""
        with st.expander("📖 Como configurar o Google Docs", expanded=False):
            st.markdown("""
            ### Passo a Passo

            **1. Abra seu documento no Google Docs**

            **2. Clique em Arquivo → Compartilhar → Publicar na Web**
            > OU: Compartilhar → altere para "Qualquer pessoa com o link pode VER"

            **3. Copie o link de compartilhamento**

            **4. Cole o link no campo abaixo**

            O sistema extrai automaticamente o `DOCUMENT_ID` da URL.

            ---

            ### ⚠️ Limitações do Embed

            | Limitação | Detalhe |
            |-----------|---------|
            | **Privacidade** | Documentos devem ser públicos para o embed funcionar |
            | **Edição** | Não é possível editar via iframe — use o botão "Abrir no Google Docs" |
            | **Bloqueio de iframe** | Alguns ambientes corporativos bloqueiam iframes externos |
            | **Autenticação** | Para documentos privados, a Fase 2 implementará OAuth + Service Account |

            ---

            ### 🚀 Fase 2 — Google Docs API (futuro)

            - Criação automática de laudos a partir de templates
            - Preenchimento de dados do paciente automaticamente
            - Compartilhamento controlado por email
            - Geração de PDF programático

            **Requer:** Google Cloud Console + Service Account + Ativação da API
            """)


# Singleton global
google_docs_service = GoogleDocsService()
