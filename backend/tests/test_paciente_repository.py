"""Testes unitários para PacienteRepository e _make_slug."""

from unittest.mock import MagicMock, patch
from core.repositories.repositories import _make_slug, PacienteRepository


class TestMakeSlug:
    def test_simple_name(self):
        assert _make_slug("João Silva") == "joao_silva"

    def test_accents(self):
        assert _make_slug("María José") == "maria_jose"

    def test_special_chars(self):
        assert _make_slug("Ana -- Maria!") == "ana_maria"

    def test_empty(self):
        assert _make_slug("") == ""
        assert _make_slug(None) == ""

    def test_whitespace_only(self):
        assert _make_slug("   ") == ""

    def test_already_lowercase(self):
        assert _make_slug("test name") == "test_name"

    def test_multiple_spaces(self):
        assert _make_slug("Ana  Maria   Silva") == "ana_maria_silva"

    def test_numbers(self):
        assert _make_slug("Paciente 123") == "paciente_123"


class TestPacienteRepository:
    def setup_method(self):
        self.repo = PacienteRepository()

    def test_row_to_model(self):
        row = {
            "id": 1, "nome": "Teste", "slug": "teste",
            "cpf": None, "telefone": None, "email": None,
            "data_nascimento": None, "sexo": None, "estado_civil": None,
            "profissao": None, "convenio": None, "numero_convenio": None,
            "empresa": None, "endereco": None, "contato_emergencia": None,
            "telefone_emergencia": None, "observacoes": None, "foto": None,
            "criado_em": None, "atualizado_em": None,
        }
        model = self.repo._row_to_model(row)
        assert model.id == 1
        assert model.nome == "Teste"
        assert model.slug == "teste"

    @patch("core.repositories.repositories.connection_scope")
    def test_create_success(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {"id": 42}
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        from core.entities.models import PacienteCreate
        data = PacienteCreate(nome="João Silva", empresa="Clinica ABC")
        result = self.repo.create(data)
        assert result == 42

    @patch("core.repositories.repositories.connection_scope")
    def test_create_empty_name_returns_0(self, mock_conn):
        from core.entities.models import PacienteCreate
        data = PacienteCreate(nome="   ")
        result = self.repo.create(data)
        assert result == 0

    @patch("core.repositories.repositories.connection_scope")
    def test_find_by_id_found(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {
            "id": 1, "nome": "Maria", "slug": "maria",
            "cpf": None, "telefone": None, "email": None,
            "data_nascimento": None, "sexo": None, "estado_civil": None,
            "profissao": None, "convenio": None, "numero_convenio": None,
            "empresa": None, "endereco": None, "contato_emergencia": None,
            "telefone_emergencia": None, "observacoes": None, "foto": None,
            "criado_em": None, "atualizado_em": None,
        }
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        result = self.repo.find_by_id(1)
        assert result is not None
        assert result.id == 1
        assert result.nome == "Maria"

    @patch("core.repositories.repositories.connection_scope")
    def test_find_by_id_not_found(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        result = self.repo.find_by_id(999)
        assert result is None

    @patch("core.repositories.repositories.connection_scope")
    def test_find_or_create_existing(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {"id": 10}
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        result = self.repo.find_or_create_by_name("João Silva")
        assert result == 10

    @patch("core.repositories.repositories.connection_scope")
    def test_find_or_create_new(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [None, {"id": 20}]
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        result = self.repo.find_or_create_by_name("Ana Souza", "Empresa X")
        assert result == 20

    @patch("core.repositories.repositories.connection_scope")
    def test_find_or_create_empty_name(self, mock_conn):
        result = self.repo.find_or_create_by_name("   ")
        assert result == 0

    @patch("core.repositories.repositories.connection_scope")
    def test_delete_success(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        assert self.repo.delete(1) is True

    @patch("core.repositories.repositories.connection_scope")
    def test_delete_not_found(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 0
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        assert self.repo.delete(999) is False

    @patch("core.repositories.repositories.connection_scope")
    def test_update_foto(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        assert self.repo.update_foto(1, "data:image/png;base64,abc") is True

    @patch("core.repositories.repositories.connection_scope")
    def test_get_foto(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {"foto": "data:image/png;base64,abc"}
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        assert self.repo.get_foto(1) == "data:image/png;base64,abc"

    @patch("core.repositories.repositories.connection_scope")
    def test_get_foto_none(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {"foto": None}
        mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)

        assert self.repo.get_foto(1) is None

    def test_count_empty_db(self):
        with patch("core.repositories.repositories.connection_scope") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {"count": 0}
            mock_conn.return_value.__enter__ = MagicMock(return_value=MagicMock(cursor=MagicMock(return_value=mock_cursor)))
            mock_conn.return_value.__exit__ = MagicMock(return_value=False)
            assert self.repo.count() == 0
