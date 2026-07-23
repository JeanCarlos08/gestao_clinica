"""Create a test Google Doc using the project's credentials loader.

Usage (from repo root):
  python backend/scripts/create_test_doc.py

The script attempts to load service account credentials via
`services.credentials_loader.load_credentials()` and creates a Google Doc
via the Drive API. It prints the created document ID and view URL.
"""
import json
from pprint import pprint

from services.credentials_loader import load_credentials

def main():
    try:
        creds = load_credentials()
    except Exception as e:
        print("Failed to load credentials:", e)
        return

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except Exception as e:
        print("Google API client libraries are not installed:", e)
        return

    scopes = ["https://www.googleapis.com/auth/drive"]
    sa_creds = service_account.Credentials.from_service_account_info(creds, scopes=scopes)
    drive = build("drive", "v3", credentials=sa_creds, cache_discovery=False)

    metadata = {"name": "Documento de Teste - Criado pelo Script", "mimeType": "application/vnd.google-apps.document"}
    created = drive.files().create(body=metadata, fields="id, name, webViewLink").execute()

    print("Created document:")
    pprint(created)
    doc_id = created.get("id")
    if doc_id:
        print("View URL:", f"https://docs.google.com/document/d/{doc_id}/edit")

if __name__ == "__main__":
    main()
