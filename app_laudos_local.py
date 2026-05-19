"""
App Streamlit para testar Google Docs API localmente

Rode com:
    streamlit run app_laudos_local.py

Acesse:
    http://localhost:8501
"""

import streamlit as st
from datetime import datetime
from pathlib import Path
import os
import stat

# Configuração da página
st.set_page_config(
    page_title="Gerador de Laudos - LOCAL",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("🏥 Gerador de Laudos - Teste Local")
st.write("**Ambiente de Teste** - localhost")


def _check_credentials(path: str = "credentials.json") -> dict | None:
    p = Path(path)
    if not p.exists():
        return None
    mode = p.stat().st_mode & 0o777
    secure = (mode & 0o077) == 0 and (mode & 0o600) == 0o600
    return {"path": str(p), "mode": oct(mode), "secure": secure}


# Mostrar aviso se credenciais estiverem presentes com permissões inseguras
creds_info = _check_credentials()
if creds_info is None:
    st.sidebar.info("`credentials.json` não encontrado (esperado para uso local)")
else:
    if not creds_info["secure"]:
        st.sidebar.warning(
            "`credentials.json` encontrado com permissões inseguras. Clique para consertar."
        )
        if st.sidebar.button("Fixar permissões (chmod 600)"):
            try:
                os.chmod(creds_info["path"], 0o600)
                st.sidebar.success("Permissões atualizadas para 600")
            except Exception as e:
                st.sidebar.error(f"Falha ao ajustar permissões: {e}")
    else:
        st.sidebar.success("`credentials.json` com permissões seguras (600)")

# Sidebar
with st.sidebar:
    st.markdown("### ⚙️ Configuração")
    modo = st.radio(
        "Selecione o modo:",
        ["📝 Teste Rápido", "🔧 Debug", "📊 Ver Configurações"],
    )

# ────────────────────────────────────────────────────────────────
# MODO 1: TESTE RÁPIDO
# ────────────────────────────────────────────────────────────────

if modo == "📝 Teste Rápido":
    st.markdown("## Teste Rápido de Conexão")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 1️⃣ Conectar Google Docs")

        if st.button("🔌 Testar Conexão", key="test_conexao", use_container_width=True):
            try:
                st.info("⏳ Conectando ao Google Docs API...")

                from services.google_docs_api import get_google_docs_api

                api = get_google_docs_api()
                st.success("✅ Conexão estabelecida!")
                st.balloons()

            except Exception as e:
                st.error(f"❌ Erro: {str(e)}")
                st.markdown("""
                **Solução:**
                1. Certifique-se que `credentials.json` está na raiz do projeto
                2. Verifique se Google Docs API está habilitada
                3. Leia o guia: `GOOGLE_DOCS_SETUP.md`
                """)

    with col2:
        st.markdown("### 2️⃣ Gerar Laudo de Teste")

        if st.button("🚀 Gerar Laudo", key="gen_laudo", use_container_width=True):
            try:
                st.info("⏳ Gerando laudo de teste...")

                from services.laudo_service import get_laudo_service, DadosLaudo

                dados = DadosLaudo(
                    nome_paciente="João Silva (TESTE)",
                    data_nascimento="15/03/1985",
                    cpf="123.456.789-00",
                    empresa="Empresa Teste LTDA",
                    data_exame=datetime.now().strftime("%d/%m/%Y"),
                    motivo_avaliacao="Teste de integração Google Docs",
                    admissional=True,
                    avaliacao_psicologica=True,
                    itens_auxiliados="✓ Teste de integração\n✓ Preenchimento automático",
                    conclusao="Laudo gerado com sucesso via API Google Docs",
                    psicologista_nome="Dra. Juliana Feitosa",
                    psicologista_crp="07/12345",
                )

                laudo_service = get_laudo_service()
                novo_doc = laudo_service.gerar_laudo(dados)

                st.success("✅ Laudo criado com sucesso!")
                st.markdown(f"**[🔗 Abrir no Google Docs]({novo_doc['url']})")

                st.json({
                    "id": novo_doc["id"],
                    "titulo": novo_doc["title"],
                    "url": novo_doc["url"],
                })

            except Exception as e:
                st.error(f"❌ Erro: {str(e)}")

# ────────────────────────────────────────────────────────────────
# MODO 2: DEBUG
# ────────────────────────────────────────────────────────────────

elif modo == "🔧 Debug":
    st.markdown("## Debug - Informações de Sistema")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 📁 Arquivos")

        # Verificar arquivos necessários
        files_to_check = [
            ("credentials.json", "Credenciais Google"),
            (".env", "Variáveis de ambiente"),
            ("services/google_docs_api.py", "Serviço Google Docs"),
            ("services/laudo_service.py", "Serviço de Laudos"),
        ]

        for file_path, desc in files_to_check:
            exists = Path(file_path).exists()
            status = "✅" if exists else "❌"
            st.write(f"{status} {desc}: `{file_path}`")

    with col2:
        st.markdown("### 🔑 Variáveis de Ambiente")

        try:
            from config import settings

            env_vars = [
                ("GOOGLE_DOCS_TEMPLATE_ID", getattr(settings, "GOOGLE_DOCS_TEMPLATE_ID", "NÃO CONFIGURADO")),
                ("GOOGLE_SERVICE_ACCOUNT_FILE", getattr(settings, "GOOGLE_SERVICE_ACCOUNT_FILE", "PADRÃO")),
                ("APP_ENV", getattr(settings, "APP_ENV", "development")),
            ]

            for var, value in env_vars:
                if value == "NÃO CONFIGURADO":
                    st.error(f"⚠️ {var} = {value}")
                else:
                    val_display = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                    st.info(f"✅ {var} = `{val_display}`")

        except Exception as e:
            st.error(f"Erro ao ler config: {e}")

    st.markdown("---")

    st.markdown("### 🧪 Testes de Função")

    if st.button("Testar Montar Replacements"):
        from services.laudo_service import LaudoService, DadosLaudo
        from unittest.mock import Mock

        # Mock da API
        mock_api = Mock()
        service = LaudoService.__new__(LaudoService)
        service.api = mock_api
        service.template_id = "test_id"

        dados = DadosLaudo(
            nome_paciente="TESTE",
            data_nascimento="01/01/2000",
            cpf="000.000.000-00",
            empresa="TESTE",
            data_exame="17/05/2024",
            motivo_avaliacao="TESTE",
            admissional=True,
        )

        replacements = service._montar_replacements(dados)

        st.success("✅ Função funciona!")
        st.json(replacements)

# ────────────────────────────────────────────────────────────────
# MODO 3: VER CONFIGURAÇÕES
# ────────────────────────────────────────────────────────────────

elif modo == "📊 Ver Configurações":
    st.markdown("## 📊 Configurações do Sistema")

    st.markdown("### .env Atual")
    try:
        with open(".env", "r") as f:
            env_content = f.read()

        # Mostrar apenas as linhas não comentadas
        env_lines = [l for l in env_content.split("\n") if l.strip() and not l.startswith("#")]

        for line in env_lines:
            if "=" in line:
                key, value = line.split("=", 1)
                if "PASSWORD" in key or "SECRET" in key or "KEY" in key:
                    value = "*" * len(value)
                st.text(f"{key.strip()} = {value[:60]}")

    except FileNotFoundError:
        st.error("❌ Arquivo .env não encontrado")

    st.markdown("---")

    st.markdown("### 📋 Guia de Configuração")

    with st.expander("Clique para expandir", expanded=False):
        st.markdown("""
        ## Passo a Passo

        ### 1. Criar Google Cloud Project
        - Acesse: https://console.cloud.google.com
        - Crie novo projeto

        ### 2. Habilitar Google Docs API
        - APIs & Services > ENABLE APIS AND SERVICES
        - Procure "Google Docs API"
        - Clique ENABLE

        ### 3. Criar Service Account
        - APIs & Services > Credentials
        - CREATE CREDENTIALS > Service Account
        - Preencha os dados
        - Clique CREATE AND CONTINUE

        ### 4. Gerar Chave JSON
        - Clique no email do Service Account
        - Aba KEYS > ADD KEY > Create new key
        - Selecione JSON
        - Clique CREATE

        ### 5. Salvar Credenciais
        ```bash
        # Copie o arquivo JSON para a raiz do projeto
        cp ~/Downloads/seu-arquivo.json ./credentials.json
        ```

        ### 6. Copiar Template ID
        - Abra seu template no Google Docs
        - Na URL: `https://docs.google.com/document/d/[ID_AQUI]/edit`
        - Cole em `GOOGLE_DOCS_TEMPLATE_ID` no .env

        ### 7. Testar
        - Execute: `streamlit run app_laudos_local.py`
        - Clique em "Teste Rápido"
        - Clique "Testar Conexão"
        """)

# ────────────────────────────────────────────────────────────────
# FOOTER
# ────────────────────────────────────────────────────────────────

st.markdown("---")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    **📚 Documentação:**
    - [Guia Setup](GOOGLE_DOCS_SETUP.md)
    - [Exemplos](examples/exemplo_laudos.py)
    - [Testes](tests/test_google_docs.py)
    """)

with col2:
    st.markdown("""
    **🔗 Links:**
    - [Google Cloud](https://console.cloud.google.com)
    - [Google Docs API](https://developers.google.com/docs/api)
    - [Streamlit](https://streamlit.io)
    """)

with col3:
    st.markdown("""
    **🚀 Status:**
    - ✅ Google Docs API instalada
    - ✅ Serviço de laudos implementado
    - ⏳ Aguardando configuração
    """)
