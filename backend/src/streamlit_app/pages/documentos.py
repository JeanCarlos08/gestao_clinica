"""Página: Documentos Google Docs."""

import streamlit as st

from core.repositories.repositories import documento_repo
from core.entities.models import DocumentoCreate
from services.google_docs_service import google_docs_service
from components.cards import render_info_banner
from utils.logger import get_logger

logger = get_logger(__name__)


def render_documentos() -> None:
    st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: var(--accent-green); padding: 8px; border-radius: 8px; font-size: 1.5rem;">📄</div>
                    <h1 style="color: var(--text-primary); margin: 0; font-size: 1.75rem;">Documentos</h1>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Templates e documentos Google Docs integrados</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    tab_embed, tab_biblioteca, tab_add = st.tabs([
        "🔍 Visualizar Documento",
        "📚 Biblioteca",
        "➕ Adicionar Documento",
    ])

    with tab_embed:
        _render_embed_tab()

    with tab_biblioteca:
        _render_biblioteca()

    with tab_add:
        _render_adicionar()


def _render_embed_tab() -> None:
    """Renderiza aba de visualização de documento via URL."""
    st.markdown("### 🔍 Visualizar Google Doc")

    google_docs_service.render_instructions()

    url_input = st.text_input(
        "URL ou ID do Google Doc",
        placeholder="https://docs.google.com/document/d/DOC_ID/edit",
        help="Cole o link de compartilhamento do Google Docs",
    )

    col1, col2 = st.columns([1, 3])
    with col1:
        height = st.slider("Altura (px)", 400, 900, 650, step=50)

    if url_input:
        google_docs_service.render_from_url(url_input, height=height)


def _render_biblioteca() -> None:
    """Renderiza biblioteca de documentos cadastrados."""
    st.markdown("### 📚 Documentos Cadastrados")

    documentos = documento_repo.list_all()

    if not documentos:
        render_info_banner(
            "Nenhum documento cadastrado. Adicione documentos na aba 'Adicionar Documento'.",
            type="info", icon="📄",
        )
        return

    for doc in documentos:
        with st.expander(f"📄 {doc.titulo} — {doc.tipo.upper()}", expanded=False):
            col_info, col_actions = st.columns([3, 1])
            with col_info:
                st.markdown(f"**Tipo:** {doc.tipo}")
                st.markdown(f"**DOC_ID:** `{doc.google_doc_id}`")
                if doc.criado_em:
                    from utils.helpers import format_datetime_br
                    st.markdown(f"**Adicionado em:** {format_datetime_br(doc.criado_em)}")

                google_docs_service.render_embedded(doc.google_doc_id, height=500)

            with col_actions:
                st.link_button("↗ Abrir", url=doc.view_url, use_container_width=True)
                if st.button("🗑️ Remover", key=f"del_doc_{doc.id}", use_container_width=True):
                    if documento_repo.delete(doc.id):
                        st.success("Documento removido!")
                        st.rerun()


def _render_adicionar() -> None:
    """Renderiza formulário para adicionar novo documento."""
    st.markdown("### ➕ Adicionar Google Doc à Biblioteca")

    with st.form("form_add_doc"):
        titulo = st.text_input("Título do Documento *", placeholder="Ex: Template de Laudo Admissional")
        url_doc = st.text_input(
            "URL do Google Doc *",
            placeholder="https://docs.google.com/document/d/DOC_ID/edit",
        )
        tipo = st.selectbox("Tipo", ["template", "laudo", "relatorio", "anamnese", "outro"])

        submitted = st.form_submit_button("💾 Adicionar", type="primary")

        if submitted:
            if not titulo or not url_doc:
                st.error("❌ Preencha todos os campos obrigatórios.")
            else:
                doc_id = google_docs_service.extract_id_from_url(url_doc)
                if not doc_id:
                    st.error("❌ URL inválida. Use uma URL do Google Docs.")
                else:
                    new_id = documento_repo.create(DocumentoCreate(
                        titulo=titulo,
                        google_doc_id=doc_id,
                        tipo=tipo,
                    ))
                    if new_id:
                        st.success(f"✅ Documento '{titulo}' adicionado com sucesso!")
                        st.rerun()
                    else:
                        st.error("❌ Erro ao salvar. Tente novamente.")
