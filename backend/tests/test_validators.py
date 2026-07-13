"""Testes para constants e validators."""

from utils.constants import (
    MODALIDADES,
    STATUS_ATENDIMENTO,
    ALL_ROLES,
    ROLE_ADMIN,
)
from utils.validators import (
    validate_empresa,
    validate_nome,
    validate_modalidade,
    validate_status,
    validate_file_upload,
)


class TestConstants:
    def test_modalidades_not_empty(self):
        assert len(MODALIDADES) > 0

    def test_status_not_empty(self):
        assert len(STATUS_ATENDIMENTO) > 0

    def test_roles_include_admin(self):
        assert ROLE_ADMIN in ALL_ROLES


class TestValidators:
    def test_validate_empresa_ok(self):
        assert validate_empresa("Empresa Teste") is None

    def test_validate_empresa_empty(self):
        assert validate_empresa("") is not None

    def test_validate_nome_ok(self):
        assert validate_nome("João Silva") is None

    def test_validate_nome_too_short(self):
        assert validate_nome("Jo") is not None

    def test_validate_modalidade_ok(self):
        assert validate_modalidade("Admissional") is None

    def test_validate_modalidade_invalid(self):
        assert validate_modalidade("Invalida") is not None

    def test_validate_status_ok(self):
        assert validate_status("Agendado") is None

    def test_validate_status_invalid(self):
        assert validate_status("Invalido") is not None

    def test_validate_file_ok(self):
        assert validate_file_upload("doc.pdf", 1024) is None

    def test_validate_file_wrong_type(self):
        assert validate_file_upload("doc.txt", 1024) is not None

    def test_validate_file_too_large(self):
        assert validate_file_upload("doc.pdf", 100 * 1024 * 1024) is not None
