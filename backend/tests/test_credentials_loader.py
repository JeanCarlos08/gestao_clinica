"""
Testes para o credentials_loader
"""

import os
import json
import base64
from unittest.mock import patch, MagicMock
import pytest

from services.credentials_loader import load_credentials, _load_from_file, _load_from_env


def test_load_from_file_exists(tmp_path):
    """Testa carregamento de arquivo local."""
    # Criar arquivo de teste
    test_creds = {"type": "service_account", "project_id": "test"}
    cred_file = tmp_path / "credentials.json"
    cred_file.write_text(json.dumps(test_creds))
    
    # Trocar diretório temporário
    with patch('pathlib.Path.cwd', return_value=tmp_path):
        os.chdir(tmp_path)
        result = _load_from_file()
    
    assert result == test_creds


def test_load_from_file_not_exists():
    """Testa quando arquivo não existe."""
    with patch('pathlib.Path.exists', return_value=False):
        result = _load_from_file()
    
    assert result is None


def test_load_from_env_base64():
    """Testa carregamento de variável de ambiente em base64."""
    test_creds = {"type": "service_account", "project_id": "test"}
    json_str = json.dumps(test_creds)
    b64_str = base64.b64encode(json_str.encode()).decode()
    
    with patch.dict(os.environ, {"GOOGLE_SERVICE_ACCOUNT_JSON_B64": b64_str}):
        result = _load_from_env()
    
    assert result == test_creds


def test_load_from_env_json():
    """Testa carregamento de variável de ambiente em JSON direto."""
    test_creds = {"type": "service_account", "project_id": "test"}
    json_str = json.dumps(test_creds)
    
    with patch.dict(os.environ, {"GOOGLE_SERVICE_ACCOUNT_JSON": json_str}):
        result = _load_from_env()
    
    assert result == test_creds


def test_load_from_env_not_set():
    """Testa quando variáveis não estão definidas."""
    with patch.dict(os.environ, {}, clear=False):
        # Remover as variáveis de teste se existirem
        os.environ.pop("GOOGLE_SERVICE_ACCOUNT_JSON_B64", None)
        os.environ.pop("GOOGLE_SERVICE_ACCOUNT_JSON", None)
        result = _load_from_env()
    
    assert result is None


@patch('services.credentials_loader._load_from_secret_manager')
@patch('services.credentials_loader._load_from_file')
@patch('services.credentials_loader._load_from_env')
def test_load_credentials_fallback(mock_env, mock_file, mock_secret):
    """Testa fallback entre métodos de carregamento."""
    test_creds = {"type": "service_account", "project_id": "test"}
    
    # Secret Manager falha, arquivo local sucede
    mock_secret.return_value = None
    mock_file.return_value = test_creds
    mock_env.return_value = None
    
    with patch.dict(os.environ, {"CREDENTIALS_SOURCE": "auto"}):
        result = load_credentials()
    
    assert result == test_creds
    mock_secret.assert_called_once()
    mock_file.assert_called_once()


@patch('services.credentials_loader._load_from_secret_manager')
def test_load_credentials_secret_manager_only(mock_secret):
    """Testa quando apenas Secret Manager está configurado."""
    test_creds = {"type": "service_account", "project_id": "test"}
    mock_secret.return_value = test_creds
    
    with patch.dict(os.environ, {"CREDENTIALS_SOURCE": "secret_manager"}):
        result = load_credentials()
    
    assert result == test_creds


def test_load_credentials_error_no_source():
    """Testa erro quando nenhuma fonte de credenciais está disponível."""
    with patch('services.credentials_loader._load_from_secret_manager', return_value=None):
        with patch('services.credentials_loader._load_from_file', return_value=None):
            with patch('services.credentials_loader._load_from_env', return_value=None):
                with patch.dict(os.environ, {"CREDENTIALS_SOURCE": "auto"}):
                    with pytest.raises(ValueError) as exc_info:
                        load_credentials()
                    assert "Não foi possível carregar credenciais" in str(exc_info.value)
