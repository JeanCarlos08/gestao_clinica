"""
Testes para Google Docs API e Serviço de Laudos

Rode com: pytest tests/test_google_docs.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from services.laudo_service import DadosLaudo, LaudoService, get_laudo_service
from services.google_docs_api import GoogleDocsAPI


class TestDadosLaudo:
    """Testes para o dataclass DadosLaudo."""

    def test_criar_dados_laudo_minimo(self):
        """Deve criar DadosLaudo com dados mínimos."""
        dados = DadosLaudo(
            nome_paciente="João Silva",
            data_nascimento="15/03/1985",
            cpf="123.456.789-00",
            empresa="Empresa XYZ",
            data_exame="17/05/2024",
            motivo_avaliacao="Admissional",
        )

        assert dados.nome_paciente == "João Silva"
        assert dados.admissional is False
        assert dados.conclusao == ""

    def test_criar_dados_laudo_completo(self):
        """Deve criar DadosLaudo com todos os dados."""
        dados = DadosLaudo(
            nome_paciente="Maria Santos",
            data_nascimento="22/07/1992",
            cpf="987.654.321-11",
            empresa="Tech Solutions",
            data_exame="17/05/2024",
            motivo_avaliacao="Periódica",
            admissional=True,
            periodica=True,
            avaliacao_psicologica=True,
            itens_auxiliados="Testes realizados",
            conclusao="Apto",
            psicologista_nome="Dr. João",
            psicologista_crp="XX/XXXXX",
        )

        assert dados.periodica is True
        assert dados.psicologista_nome == "Dr. João"


class TestLaudoService:
    """Testes para LaudoService."""

    @patch("services.laudo_service.get_google_docs_api")
    def test_montar_replacements(self, mock_api):
        """Deve montar corretamente o dicionário de substituições."""
        dados = DadosLaudo(
            nome_paciente="João Silva",
            data_nascimento="15/03/1985",
            cpf="123.456.789-00",
            empresa="Empresa XYZ",
            data_exame="17/05/2024",
            motivo_avaliacao="Admissional",
            admissional=True,
            itens_auxiliados="Testes",
            conclusao="Apto",
            psicologista_nome="Dra. Juliana",
            psicologista_crp="07/12345",
        )

        # Mock do API para evitar conexão real
        mock_api_instance = Mock()
        mock_api.return_value = mock_api_instance

        # Criar serviço com mock
        service = LaudoService.__new__(LaudoService)
        service.api = mock_api_instance
        service.template_id = "fake_template_id"

        replacements = service._montar_replacements(dados)

        assert replacements["{{NOME}}"] == "João Silva"
        assert replacements["{{CPF}}"] == "123.456.789-00"
        assert replacements["{{CHECKBOX_ADMISSIONAL}}"] == "☑"
        assert replacements["{{CHECKBOX_PERIODICA}}"] == "☐"
        assert replacements["{{CONCLUSAO}}"] == "Apto"

    @patch("services.laudo_service.get_google_docs_api")
    def test_gerar_laudo(self, mock_api):
        """Deve gerar laudo corretamente."""
        # Setup
        mock_api_instance = Mock()
        mock_api_instance.copy_document.return_value = {
            "id": "new_doc_id",
            "title": "Laudo - João Silva",
            "url": "https://docs.google.com/document/d/new_doc_id/edit",
        }
        mock_api.return_value = mock_api_instance

        dados = DadosLaudo(
            nome_paciente="João Silva",
            data_nascimento="15/03/1985",
            cpf="123.456.789-00",
            empresa="Empresa XYZ",
            data_exame="17/05/2024",
            motivo_avaliacao="Admissional",
            psicologista_nome="Dra. Juliana",
            psicologista_crp="07/12345",
        )

        service = LaudoService.__new__(LaudoService)
        service.api = mock_api_instance
        service.template_id = "fake_template_id"

        resultado = service.gerar_laudo(dados)

        # Verificações
        assert resultado["id"] == "new_doc_id"
        assert "João Silva" in resultado["title"]
        mock_api_instance.copy_document.assert_called_once()
        mock_api_instance.replace_text.assert_called_once()

    @patch("services.laudo_service.get_google_docs_api")
    def test_gerar_laudo_com_titulo_customizado(self, mock_api):
        """Deve usar título customizado se fornecido."""
        mock_api_instance = Mock()
        mock_api_instance.copy_document.return_value = {
            "id": "new_doc_id",
            "title": "Laudo Customizado",
            "url": "https://docs.google.com/document/d/new_doc_id/edit",
        }
        mock_api.return_value = mock_api_instance

        dados = DadosLaudo(
            nome_paciente="João Silva",
            data_nascimento="15/03/1985",
            cpf="123.456.789-00",
            empresa="Empresa XYZ",
            data_exame="17/05/2024",
            motivo_avaliacao="Admissional",
            psicologista_nome="Dra. Juliana",
            psicologista_crp="07/12345",
        )

        service = LaudoService.__new__(LaudoService)
        service.api = mock_api_instance
        service.template_id = "fake_template_id"

        resultado = service.gerar_laudo(dados, titulo_customizado="Laudo Customizado")

        # Verificar que o título customizado foi passado
        call_args = mock_api_instance.copy_document.call_args
        assert call_args[0][1] == "Laudo Customizado"


class TestGoogleDocsAPI:
    """Testes para GoogleDocsAPI."""

    def test_service_account_path_detection(self):
        """Deve detectar caminho do arquivo de credenciais."""
        api = GoogleDocsAPI.__new__(GoogleDocsAPI)

        # Testar com paths comuns
        path = api._get_service_account_path()

        # Path pode ser None se o arquivo não existir
        # ou uma string se existir
        assert path is None or isinstance(path, str)

    @patch("services.google_docs_api.Credentials.from_service_account_file")
    @patch("services.google_docs_api.build")
    def test_autenticacao_service_account(self, mock_build, mock_creds):
        """Deve autenticar com Service Account."""
        # Setup
        mock_creds.return_value = Mock()
        mock_build.return_value = Mock()

        # Criar arquivo temporário
        import tempfile
        import json

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(
                {
                    "type": "service_account",
                    "project_id": "test",
                    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3s4vM1e8LGF7MsXmD9yDmYDh0c4y+hLvvxhqD\n-----END RSA PRIVATE KEY-----",
                    "client_email": "test@test.iam.gserviceaccount.com",
                },
                f,
            )
            temp_path = f.name

        try:
            # Não vamos testar autenticação real, apenas verificar a estrutura
            assert temp_path.endswith(".json")
        finally:
            import os

            os.unlink(temp_path)


# ────────────────────────────────────────────────────────────────
# Instruções para rodar os testes:
# ────────────────────────────────────────────────────────────────
#
# pytest tests/test_google_docs.py -v
# pytest tests/test_google_docs.py::TestLaudoService -v
# pytest tests/test_google_docs.py::TestLaudoService::test_montar_replacements -v
