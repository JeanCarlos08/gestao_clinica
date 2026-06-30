"""
Testes de validação — utils/validators.py
"""

import pytest
from datetime import date, time

from utils.validators import (
    validate_empresa,
    validate_nome,
    validate_modalidade,
    validate_status,
    validate_file_upload,
    validate_atendimento,
)
from utils.constants import MODALIDADES, STATUS_ATENDIMENTO, MAX_FILE_SIZE_BYTES


class TestValidateEmpresa:
    def test_valida_empresa_correta(self):
        assert validate_empresa("Empresa ABC LTDA") is None

    def test_empresa_vazia(self):
        assert validate_empresa("") is not None
        assert validate_empresa("  ") is not None

    def test_empresa_muito_curta(self):
        assert validate_empresa("A") is not None

    def test_empresa_muito_longa(self):
        assert validate_empresa("A" * 300) is not None


class TestValidateNome:
    def test_valida_nome_correto(self):
        assert validate_nome("João da Silva") is None

    def test_nome_vazio(self):
        assert validate_nome("") is not None

    def test_nome_muito_curto(self):
        assert validate_nome("Jo") is not None

    def test_nome_com_numeros(self):
        # Números no nome devem retornar erro
        assert validate_nome("João123") is not None

    def test_nome_com_acentos(self):
        assert validate_nome("Bárbara Ângela Conceição") is None


class TestValidateModalidade:
    def test_modalidade_valida(self):
        for mod in MODALIDADES:
            assert validate_modalidade(mod) is None

    def test_modalidade_invalida(self):
        assert validate_modalidade("Invalida") is not None

    def test_modalidade_vazia(self):
        assert validate_modalidade("") is not None


class TestValidateStatus:
    def test_status_valido(self):
        for status in STATUS_ATENDIMENTO:
            assert validate_status(status) is None

    def test_status_invalido(self):
        assert validate_status("StatusInexistente") is not None


class TestValidateFileUpload:
    def test_pdf_valido(self):
        assert validate_file_upload("laudo.pdf", 1024) is None

    def test_extensao_invalida(self):
        assert validate_file_upload("foto.jpg", 1024) is not None
        assert validate_file_upload("documento.docx", 1024) is not None

    def test_arquivo_muito_grande(self):
        assert validate_file_upload("grande.pdf", MAX_FILE_SIZE_BYTES + 1) is not None

    def test_arquivo_no_limite(self):
        assert validate_file_upload("limite.pdf", MAX_FILE_SIZE_BYTES) is None


class TestValidateAtendimento:
    def test_atendimento_valido(self):
        errors = validate_atendimento(
            empresa="Empresa ABC",
            nome="João da Silva",
            modalidade="Admissional",
            data_atendimento=date.today(),
            hora_atendimento=time(9, 0),
        )
        assert errors == []

    def test_atendimento_invalido_multiplos_erros(self):
        errors = validate_atendimento(
            empresa="",
            nome="",
            modalidade="Inválida",
            data_atendimento=None,
            hora_atendimento=None,
        )
        assert len(errors) >= 4
