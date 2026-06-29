"""
Componente Streamlit para geração de laudos

Integra a geração de laudos Google Docs na interface
"""

import streamlit as st
from datetime import datetime
from pathlib import Path

from services.laudo_service import get_laudo_service, DadosLaudo
from utils.logger import get_logger

logger = get_logger(__name__)


def render_gerador_laudos():
    """Renderiza a seção de geração de laudos no Streamlit."""

    st.header("📄 Gerador de Laudos Psicossociais")

    # Criar tabs
    tab1, tab2, tab3 = st.tabs(
        ["Gerar Novo Laudo", "Meus Laudos", "Configurações"]
    )

    # ─────────────────────────────────────────────────────────────
    # TAB 1: GERAR NOVO LAUDO
    # ─────────────────────────────────────────────────────────────
    with tab1:
        render_novo_laudo()

    # ─────────────────────────────────────────────────────────────
    # TAB 2: MEUS LAUDOS
    # ─────────────────────────────────────────────────────────────
    with tab2:
        render_meus_laudos()

    # ─────────────────────────────────────────────────────────────
    # TAB 3: CONFIGURAÇÕES
    # ─────────────────────────────────────────────────────────────
    with tab3:
        render_configuracoes()


def render_novo_laudo():
    """Renderiza formulário para gerar novo laudo."""

    st.subheader("Criar Novo Laudo")

    with st.form("form_novo_laudo", clear_on_submit=True):
        # ─ IDENTIFICAÇÃO ────────────────────────────────────────
        st.markdown("### 1️⃣ Identificação do Paciente")

        col1, col2 = st.columns(2)
        with col1:
            nome_paciente = st.text_input("Nome Completo", placeholder="João Silva Santos")
            data_nascimento = st.date_input("Data de Nascimento")

        with col2:
            cpf = st.text_input("CPF", placeholder="123.456.789-00")
            empresa = st.text_input("Empresa", placeholder="Empresa XYZ LTDA")

        # ─ AVALIAÇÃO ────────────────────────────────────────────
        st.markdown("### 2️⃣ Dados da Avaliação")

        col1, col2 = st.columns(2)
        with col1:
            data_exame = st.date_input("Data do Exame")

        with col2:
            st.markdown("**Tipo de Avaliação:**")
            col_a, col_b, col_c, col_d = st.columns(4)
            with col_a:
                check_admissional = st.checkbox("Admissional")
            with col_b:
                check_periodica = st.checkbox("Periódica")
            with col_c:
                check_pessoal = st.checkbox("Pessoal")
            with col_d:
                check_mudanca = st.checkbox("Mudança Função")

        motivo_avaliacao = st.text_area(
            "Motivo da Avaliação",
            placeholder="Descreva o motivo da avaliação...",
            height=80,
        )

        # ─ CONTEÚDO ─────────────────────────────────────────────
        st.markdown("### 3️⃣ Conteúdo do Laudo")

        itens_auxiliados = st.text_area(
            "Itens Auxiliares / Testes Realizados",
            placeholder="• Testes psicométricos\n• Entrevista clínica\n• Análise comportamental",
            height=100,
        )

        conclusao = st.text_area(
            "Conclusão",
            placeholder="Resultados e recomendações da avaliação...",
            height=100,
        )

        # ─ PROFISSIONAL ─────────────────────────────────────────
        st.markdown("### 4️⃣ Dados do Profissional")

        col1, col2 = st.columns(2)
        with col1:
            psicologista_nome = st.text_input("Nome do Psicólogo", placeholder="Nome do profissional")
        with col2:
            psicologista_crp = st.text_input("CRP", value="07/12345")

        # ─ AÇÕES ────────────────────────────────────────────────
        col1, col2, col3 = st.columns([2, 1, 1])

        with col1:
            submit_button = st.form_submit_button(
                "🚀 Gerar Laudo", use_container_width=True, type="primary"
            )

        with col2:
            export_pdf = st.checkbox("Exportar PDF", value=True)

        with col3:
            compartilhar = st.checkbox("Compartilhar", value=False)

        # ─ PROCESSAR FORMULÁRIO ────────────────────────────────
        if submit_button:
            try:
                # Validações
                if not nome_paciente:
                    st.error("❌ Nome do paciente é obrigatório")
                    return

                if not cpf:
                    st.error("❌ CPF é obrigatório")
                    return

                # Preparar dados
                dados = DadosLaudo(
                    nome_paciente=nome_paciente,
                    data_nascimento=data_nascimento.strftime("%d/%m/%Y"),
                    cpf=cpf,
                    empresa=empresa,
                    data_exame=data_exame.strftime("%d/%m/%Y"),
                    motivo_avaliacao=motivo_avaliacao,
                    avaliacao_psicologica=True,  # Sempre verdadeiro
                    admissional=check_admissional,
                    periodica=check_periodica,
                    pessoal=check_pessoal,
                    mudanca_funcao=check_mudanca,
                    itens_auxiliados=itens_auxiliados,
                    conclusao=conclusao,
                    psicologista_nome=psicologista_nome,
                    psicologista_crp=psicologista_crp,
                )

                # Gerar laudo
                with st.spinner("⏳ Gerando laudo..."):
                    laudo_service = get_laudo_service()

                    if export_pdf:
                        # Gerar e exportar PDF
                        pdf_filename = (
                            f"{nome_paciente.replace(' ', '_')}_{data_exame.strftime('%Y%m%d')}.pdf"
                        )
                        pdf_path = f"./laudos/{pdf_filename}"

                        pdf_result = laudo_service.gerar_e_exportar_pdf(
                            dados, caminho_pdf=pdf_path
                        )

                        st.success(f"✅ PDF gerado: {pdf_filename}")

                        # Download button
                        with open(pdf_path, "rb") as pdf_file:
                            st.download_button(
                                label="📥 Baixar PDF",
                                data=pdf_file.read(),
                                file_name=pdf_filename,
                                mime="application/pdf",
                            )
                    else:
                        # Gerar apenas no Google Docs
                        novo_doc = laudo_service.gerar_laudo(dados)
                        st.success(f"✅ Laudo criado com sucesso!")

                        st.markdown(
                            f"[🔗 Abrir no Google Docs]({novo_doc['url']})",
                            unsafe_allow_html=True,
                        )

                        # Compartilhar se solicitado
                        if compartilhar:
                            email = st.text_input("Email para compartilhar:")
                            if st.button("Compartilhar"):
                                laudo_service.compartilhar_com_paciente(
                                    novo_doc["id"], email
                                )
                                st.info(f"✅ Laudo compartilhado com {email}")

            except Exception as e:
                st.error(f"❌ Erro ao gerar laudo: {str(e)}")
                logger.error(f"Erro ao gerar laudo: {e}")


def render_meus_laudos():
    """Renderiza lista de laudos gerados."""

    st.subheader("Meus Laudos")

    # Buscar arquivos PDF
    laudos_dir = Path("./laudos")
    if laudos_dir.exists():
        pdf_files = list(laudos_dir.glob("*.pdf"))

        if pdf_files:
            st.info(f"📊 Total de laudos: {len(pdf_files)}")

            for pdf_file in sorted(pdf_files, reverse=True):
                col1, col2, col3 = st.columns([3, 1, 1])

                with col1:
                    st.write(f"📄 {pdf_file.name}")
                    st.caption(f"Criado em: {pdf_file.stat().st_mtime}")

                with col2:
                    with open(pdf_file, "rb") as f:
                        st.download_button(
                            "Download",
                            data=f.read(),
                            file_name=pdf_file.name,
                            mime="application/pdf",
                            key=str(pdf_file),
                        )

                with col3:
                    if st.button("🗑️", key=f"delete_{pdf_file}"):
                        pdf_file.unlink()
                        st.rerun()

        else:
            st.info("📭 Nenhum laudo gerado ainda")

    else:
        st.info("📁 Pasta de laudos vazia")


def render_configuracoes():
    """Renderiza configurações da integração Google Docs."""

    st.subheader("⚙️ Configurações")

    st.markdown("""
    ### Verificar Status de Conexão

    Clique no botão abaixo para verificar se a integração com Google Docs está funcionando.
    """)

    if st.button("🔍 Verificar Conexão"):
        try:
            laudo_service = get_laudo_service()
            template_id = laudo_service.template_id

            st.success(f"✅ Conexão OK!")
            st.info(f"Template ID: `{template_id}`")

        except Exception as e:
            st.error(f"❌ Erro na conexão: {str(e)}")

    st.markdown("---")

    st.markdown("""
    ### Documentação

    Para mais informações sobre como configurar a integração com Google Docs:

    - [📖 Guia de Setup](GOOGLE_DOCS_SETUP.md)
    - [💻 Exemplos de Código](examples/exemplo_laudos.py)
    - [🧪 Testes](tests/test_google_docs.py)
    """)

    st.markdown("---")

    st.markdown("""
    ### Troubleshooting

    **Problema:** Laudo não é gerado

    **Solução:**
    1. Verifique se `GOOGLE_DOCS_TEMPLATE_ID` está configurado no `.env`
    2. Verifique se o arquivo `credentials.json` existe
    3. Confirme que Google Docs API está habilitada
    """)


# ────────────────────────────────────────────────────────────────
# Como integrar no seu app.py do Streamlit:
# ────────────────────────────────────────────────────────────────
#
# from components.streamlit_laudos import render_gerador_laudos
#
# if st.session_state.get("pagina") == "laudos":
#     render_gerador_laudos()
