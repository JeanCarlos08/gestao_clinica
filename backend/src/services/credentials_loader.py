"""
Carregador inteligente de credenciais do Google Service Account.

Tenta em ordem:
1. Google Secret Manager (se CREDENTIALS_SOURCE=secret_manager)
2. Arquivo local (credentials.json)
3. Variável de ambiente (GOOGLE_SERVICE_ACCOUNT_JSON_B64)
4. Falha com erro claro
"""

import os
import json
import base64
from pathlib import Path
from typing import Dict, Any

from utils.logger import get_logger

logger = get_logger(__name__)


def load_credentials() -> Dict[str, Any]:
    """
    Carrega credenciais do Google Service Account.
    
    Returns:
        Dict com credenciais do Google
    
    Raises:
        ValueError: se nenhuma fonte de credenciais for encontrada
    """
    
    credentials_source = os.getenv("CREDENTIALS_SOURCE", "auto").lower()
    
    # Tentar Secret Manager se configurado
    if credentials_source in ("secret_manager", "auto"):
        try:
            creds = _load_from_secret_manager()
            if creds:
                logger.info("✓ Credenciais carregadas do Secret Manager")
                return creds
        except Exception as e:
            logger.debug(f"Secret Manager não disponível: {e}")
            if credentials_source == "secret_manager":
                raise
    
    # Tentar arquivo local
    if credentials_source in ("local", "auto"):
        try:
            creds = _load_from_file()
            if creds:
                logger.info("✓ Credenciais carregadas de arquivo local")
                return creds
        except Exception as e:
            logger.debug(f"Arquivo local não disponível: {e}")
            if credentials_source == "local":
                raise
    
    # Tentar variável de ambiente
    if credentials_source in ("env", "auto"):
        try:
            creds = _load_from_env()
            if creds:
                logger.info("✓ Credenciais carregadas de variável de ambiente")
                return creds
        except Exception as e:
            logger.debug(f"Variável de ambiente não disponível: {e}")
            if credentials_source == "env":
                raise
    
    # Nenhuma fonte funcionou
    raise ValueError(
        "Não foi possível carregar credenciais do Google Service Account.\n\n"
        "Opções:\n"
        "1. Arquivo local: coloque credentials.json na raiz do projeto\n"
        "2. Secret Manager: configure CREDENTIALS_SOURCE=secret_manager\n"
        "3. Variável: configure GOOGLE_SERVICE_ACCOUNT_JSON_B64 (base64)\n"
        "\nVeja SECURITY_SETUP.md para instruções."
    )


def _load_from_file() -> Dict[str, Any] | None:
    """Carrega credenciais de arquivo local."""
    cred_path = Path("credentials.json")
    
    if not cred_path.exists():
        return None
    
    with open(cred_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_from_secret_manager() -> Dict[str, Any] | None:
    """Carrega credenciais do Google Secret Manager."""
    try:
        from google.cloud import secretmanager
    except ImportError:
        return None
    
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    secret_name = os.getenv("GOOGLE_SECRET_NAME", "google-docs-sa-key")
    
    if not project_id:
        return None
    
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        
        creds_json = response.payload.data.decode("UTF-8")
        return json.loads(creds_json)
    except Exception as e:
        logger.debug(f"Erro ao acessar Secret Manager: {e}")
        return None


def _load_from_env() -> Dict[str, Any] | None:
    """Carrega credenciais de variável de ambiente (base64 ou JSON)."""
    
    # Tentar base64
    creds_b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_B64")
    if creds_b64:
        try:
            creds_json = base64.b64decode(creds_b64).decode("utf-8")
            return json.loads(creds_json)
        except Exception as e:
            logger.debug(f"Erro ao decodificar credenciais base64: {e}")
    
    # Tentar JSON direto
    creds_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if creds_json:
        try:
            return json.loads(creds_json)
        except Exception as e:
            logger.debug(f"Erro ao fazer parse do JSON: {e}")
    
    return None
