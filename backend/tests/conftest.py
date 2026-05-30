"""
Fixtures compartilhadas para os testes do mvpdepsicologia.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import date, time


@pytest.fixture
def mock_connection():
    """Mock de conexão PostgreSQL para testes unitários."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    cursor.fetchone.return_value = None
    cursor.fetchall.return_value = []
    cursor.rowcount = 1
    return conn, cursor


@pytest.fixture
def sample_atendimento_data():
    """Dados de exemplo para criação de atendimento."""
    return {
        "empresa": "Empresa Teste LTDA",
        "nome": "João da Silva Teste",
        "modalidade": "Admissional",
        "data": date(2024, 6, 15),
        "hora": time(9, 0),
        "status": "Agendado",
        "observacoes": "Paciente colaborativo, sem queixas.",
    }


@pytest.fixture
def mock_db(monkeypatch, mock_connection):
    """Monkeypatcha a conexão do banco para os testes."""
    conn, cursor = mock_connection
    monkeypatch.setattr(
        "database.connection.get_connection",
        lambda: conn,
    )
    return conn, cursor
