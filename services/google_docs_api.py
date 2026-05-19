"""
Google Docs API Service - Integração com Google Docs Official API

Permite:
- Criar cópias de templates
- Preencher campos automaticamente
- Gerar laudos e documentos programaticamente
- Compartilhar documentos com usuários

Requisitos:
1. Google Cloud Project com Google Docs API habilitada
2. Service Account JSON credentials
3. Variáveis de ambiente configuradas
"""

import json
import os
from typing import Optional, Dict, List, Any
from pathlib import Path

from google.auth.service_account import Credentials
from google.oauth2.credentials import Credentials as UserCredentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import settings
from utils.logger import get_logger
from services.credentials_loader import load_credentials

logger = get_logger(__name__)

# Escopos necessários para Google Docs API
SCOPES = ["https://www.googleapis.com/auth/documents"]


class GoogleDocsAPI:
    """
    Cliente para Google Docs API v1.

    Exemplo de uso:
        api = GoogleDocsAPI()
        # Copiar template
        new_doc = api.copy_document(
            "TEMPLATE_DOC_ID",
            "Laudo - João Silva"
        )
        # Preencher campos
        api.replace_text(new_doc["id"], {
            "{{NOME}}": "João Silva",
            "{{CPF}}": "123.456.789-00"
        })
    """

    def __init__(self):
        """Inicializa o cliente da Google Docs API."""
        self.service = None
        self.drive_service = None
        self._authenticate()

    def _authenticate(self) -> None:
        """Autentica usando Service Account ou User OAuth."""
        try:
            # Tentar carregar Service Account (arquivo local, Secret Manager, ou env)
            try:
                creds_dict = load_credentials()
                credentials = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
                logger.info("✓ Autenticação via Service Account (inteligente)")
            except ValueError:
                # Fallback para OAuth interativo
                credentials = self._authenticate_user_oauth()
                logger.info("✓ Autenticação via OAuth User")

            self.service = build("docs", "v1", credentials=credentials)
            self.drive_service = build("drive", "v3", credentials=credentials)

        except Exception as e:
            logger.error(f"✗ Erro na autenticação Google Docs: {e}")
            raise

    def _get_service_account_path(self) -> Optional[str]:
        """Obtém o caminho do arquivo de credenciais Service Account."""
        # Tentar variáveis de ambiente
        if hasattr(settings, "GOOGLE_SERVICE_ACCOUNT_FILE"):
            return settings.GOOGLE_SERVICE_ACCOUNT_FILE

        # Tentar paths comuns
        common_paths = [
            "/media/jean/7AF8AFA7F8AF5FDD/gestao_clinica/credentials.json",
            "./credentials.json",
            os.path.expanduser("~/.google/credentials.json"),
        ]

        for path in common_paths:
            if os.path.exists(path):
                return path

        return None

    def _authenticate_user_oauth(self) -> UserCredentials:
        """Autentica usando OAuth 2.0 interativo (para desenvolvimento)."""
        flow = InstalledAppFlow.from_client_secrets_file(
            "client_secret.json", SCOPES
        )
        credentials = flow.run_local_server(port=0)
        return credentials

    def copy_document(self, template_id: str, new_title: str, folder_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Copia um documento template e retorna o novo documento.

        Args:
            template_id: ID do documento template
            new_title: Título para o novo documento
            folder_id: ID da pasta para salvar (opcional)

        Returns:
            Dict com informações do novo documento
        """
        try:
            # Copiar no Google Drive
            copy_metadata = {"name": new_title}
            if folder_id:
                copy_metadata["parents"] = [folder_id]

            copied_file = (
                self.drive_service.files()
                .copy(fileId=template_id, body=copy_metadata)
                .execute()
            )

            new_doc_id = copied_file.get("id")
            logger.info(f"✓ Documento copiado: {new_title} ({new_doc_id})")

            return {
                "id": new_doc_id,
                "title": new_title,
                "url": f"https://docs.google.com/document/d/{new_doc_id}/edit",
            }

        except HttpError as error:
            logger.error(f"✗ Erro ao copiar documento: {error}")
            raise

    def replace_text(self, doc_id: str, replacements: Dict[str, str]) -> None:
        """
        Substitui texto no documento.

        Args:
            doc_id: ID do documento
            replacements: Dict com {placeholder: valor} ex: {"{{NOME}}": "João"}
        """
        try:
            requests = []

            for placeholder, value in replacements.items():
                requests.append(
                    {
                        "replaceAllText": {
                            "containsText": {
                                "text": placeholder,
                                "matchCase": True,
                            },
                            "replaceText": value or "",
                        }
                    }
                )

            if requests:
                self.service.documents().batchUpdate(
                    documentId=doc_id, body={"requests": requests}
                ).execute()

                logger.info(f"✓ Texto substituído no documento {doc_id}")

        except HttpError as error:
            logger.error(f"✗ Erro ao substituir texto: {error}")
            raise

    def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Obtém o conteúdo completo do documento."""
        try:
            document = self.service.documents().get(documentId=doc_id).execute()
            return document
        except HttpError as error:
            logger.error(f"✗ Erro ao obter documento: {error}")
            raise

    def insert_table(
        self,
        doc_id: str,
        rows: int,
        columns: int,
        content: Optional[List[List[str]]] = None,
    ) -> None:
        """
        Insere uma tabela no documento.

        Args:
            doc_id: ID do documento
            rows: Número de linhas
            columns: Número de colunas
            content: Lista de listas com conteúdo (opcional)
        """
        try:
            requests = [
                {
                    "insertTable": {
                        "rows": rows,
                        "columns": columns,
                        "endOfSegmentLocation": {},
                    }
                }
            ]

            self.service.documents().batchUpdate(
                documentId=doc_id, body={"requests": requests}
            ).execute()

            logger.info(f"✓ Tabela inserida no documento {doc_id}")

        except HttpError as error:
            logger.error(f"✗ Erro ao inserir tabela: {error}")
            raise

    def share_document(
        self, doc_id: str, email: str, role: str = "viewer"
    ) -> None:
        """
        Compartilha o documento com um usuário.

        Args:
            doc_id: ID do documento
            email: Email do usuário
            role: 'viewer', 'commenter', ou 'editor'
        """
        try:
            permission = {
                "type": "user",
                "role": role,
                "emailAddress": email,
            }

            self.drive_service.permissions().create(
                fileId=doc_id,
                body=permission,
                fields="id",
            ).execute()

            logger.info(f"✓ Documento compartilhado com {email} ({role})")

        except HttpError as error:
            logger.error(f"✗ Erro ao compartilhar: {error}")
            raise

    def export_as_pdf(self, doc_id: str, output_path: str) -> str:
        """
        Exporta o documento como PDF.

        Args:
            doc_id: ID do documento
            output_path: Caminho para salvar o PDF

        Returns:
            Caminho do arquivo PDF criado
        """
        try:
            # Google Drive export
            pdf_file = (
                self.drive_service.files()
                .export(fileId=doc_id, mimeType="application/pdf")
                .execute()
            )

            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "wb") as f:
                f.write(pdf_file)

            logger.info(f"✓ PDF exportado: {output_path}")
            return output_path

        except HttpError as error:
            logger.error(f"✗ Erro ao exportar PDF: {error}")
            raise

    def delete_document(self, doc_id: str) -> None:
        """Deleta um documento."""
        try:
            self.drive_service.files().delete(fileId=doc_id).execute()
            logger.info(f"✓ Documento deletado: {doc_id}")
        except HttpError as error:
            logger.error(f"✗ Erro ao deletar: {error}")
            raise


# Instância global
_google_docs_api: Optional[GoogleDocsAPI] = None


def get_google_docs_api() -> GoogleDocsAPI:
    """Retorna instância singleton da Google Docs API."""
    global _google_docs_api
    if _google_docs_api is None:
        _google_docs_api = GoogleDocsAPI()
    return _google_docs_api
