"""
Testes do N8N Service.
"""

import pytest
from unittest.mock import patch, MagicMock

from services.n8n_service import N8NService


class TestN8NService:
    def setup_method(self):
        self.service = N8NService()

    def test_nao_configurado_sem_url(self, monkeypatch):
        monkeypatch.setattr("services.n8n_service.settings.n8n_webhook_base_url", "")
        service = N8NService()
        assert not service.is_configured

    def test_configurado_com_url(self, monkeypatch):
        monkeypatch.setattr(
            "services.n8n_service.settings.n8n_webhook_base_url",
            "https://test.n8n.cloud/webhook"
        )
        service = N8NService()
        assert service.is_configured

    def test_trigger_sem_configuracao(self, monkeypatch):
        monkeypatch.setattr("services.n8n_service.settings.n8n_webhook_base_url", "")
        service = N8NService()
        success, msg = service.trigger("test-event")
        assert not success
        assert "não configurado" in msg.lower()

    @patch("services.n8n_service.requests.post")
    def test_trigger_sucesso(self, mock_post, monkeypatch):
        monkeypatch.setattr(
            "services.n8n_service.settings.n8n_webhook_base_url",
            "https://test.n8n.cloud/webhook"
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        service = N8NService()
        success, msg = service.trigger("test-event", {"key": "value"})
        assert success
        mock_post.assert_called_once()

    @patch("services.n8n_service.requests.post")
    def test_trigger_falha_http(self, mock_post, monkeypatch):
        monkeypatch.setattr(
            "services.n8n_service.settings.n8n_webhook_base_url",
            "https://test.n8n.cloud/webhook"
        )
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response

        service = N8NService()
        # Retry = 1 para o teste não demorar
        success, msg = service.trigger("test-event", {}, retries=1)
        assert not success
