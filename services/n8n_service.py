"""
Serviço de integração com n8n Cloud.

Responsável por disparar webhooks no n8n para automações:
- Notificação WhatsApp ao criar atendimento
- Lembrete D-1 de agendamento
- Relatório semanal automático
- Qualquer evento customizável

Implementa:
- requests.post() com timeout configurável
- Retry com backoff exponencial (3 tentativas)
- Log de cada disparo (sucesso/erro)
- Payload JSON padronizado

Uso:
    from services.n8n_service import n8n_service
    ok = n8n_service.trigger(N8N_EVENT_ATENDIMENTO_CRIADO, payload)
"""

import time
from typing import Any, Dict, Optional

import requests

from config import settings
from utils.constants import (
    N8N_EVENT_ATENDIMENTO_CRIADO,
    N8N_EVENT_LEMBRETE,
    N8N_EVENT_RELATORIO_SEMANAL,
    N8N_EVENT_STATUS_CHANGED,
    N8N_MAX_RETRIES,
    N8N_TIMEOUT_SECONDS,
)
from utils.logger import get_logger

logger = get_logger(__name__)


class N8NService:
    """
    Cliente para disparar webhooks no n8n Cloud.

    Os webhooks são URLs no formato:
    https://<workspace>.app.n8n.cloud/webhook/<endpoint>
    """

    def __init__(self) -> None:
        self._base_url = (settings.n8n_webhook_base_url or "").rstrip("/")
        self._secret = settings.n8n_webhook_secret

    @property
    def is_configured(self) -> bool:
        """Retorna True se a URL base do n8n está configurada."""
        return bool(self._base_url)

    def _build_url(self, event: str) -> str:
        """Constrói a URL completa do webhook para um evento."""
        return f"{self._base_url}/{event}"

    def _build_headers(self) -> Dict[str, str]:
        """Constrói os headers da requisição."""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"mvpdepsicologia/{settings.app_version}",
        }
        # Autenticação via header secret (configurar no n8n)
        if self._secret:
            headers["X-Webhook-Secret"] = self._secret
        return headers

    def trigger(
        self,
        event: str,
        payload: Optional[Dict[str, Any]] = None,
        retries: int = N8N_MAX_RETRIES,
    ) -> tuple[bool, str]:
        """
        Dispara um evento webhook no n8n com retry automático.

        Args:
            event: Nome do endpoint do webhook (ex: 'atendimento-criado').
            payload: Dados JSON a enviar no corpo da requisição.
            retries: Número máximo de tentativas.

        Returns:
            Tuple (success: bool, message: str)
        """
        if not self.is_configured:
            logger.warning(f"N8N: Disparo de '{event}' ignorado — URL base não configurada.")
            return False, "n8n não configurado. Defina N8N_WEBHOOK_BASE_URL no .env."

        url = self._build_url(event)
        data = payload or {}
        data["_event"] = event
        data["_source"] = "mvpdepsicologia"
        data["_version"] = settings.app_version

        last_error = "Erro desconhecido"

        for attempt in range(1, retries + 1):
            try:
                response = requests.post(
                    url=url,
                    json=data,
                    headers=self._build_headers(),
                    timeout=N8N_TIMEOUT_SECONDS,
                )

                if response.status_code in (200, 201, 202):
                    logger.info(f"N8N: Evento '{event}' disparado com sucesso (HTTP {response.status_code}).")
                    return True, f"Automação '{event}' ativada com sucesso."

                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.warning(f"N8N: Tentativa {attempt}/{retries} — {last_error}")

            except requests.Timeout:
                last_error = f"Timeout após {N8N_TIMEOUT_SECONDS}s"
                logger.warning(f"N8N: Tentativa {attempt}/{retries} — Timeout.")
            except requests.ConnectionError:
                last_error = "Falha de conexão com o servidor n8n"
                logger.warning(f"N8N: Tentativa {attempt}/{retries} — Sem conexão.")
            except Exception as e:
                last_error = str(e)
                logger.error(f"N8N: Erro inesperado na tentativa {attempt}: {e}")

            # Backoff exponencial entre tentativas
            if attempt < retries:
                wait_seconds = 2 ** attempt  # 2s, 4s, 8s
                time.sleep(wait_seconds)

        logger.error(f"N8N: Falha após {retries} tentativas para evento '{event}': {last_error}")
        return False, f"Falha ao disparar automação após {retries} tentativas: {last_error}"

    # ─────────────────────────────────────────────────────────
    # Métodos de domínio (wrappers tipados)
    # ─────────────────────────────────────────────────────────

    def trigger_atendimento_criado(
        self,
        atendimento_id: int,
        nome: str,
        empresa: str,
        modalidade: str,
        data_str: str,
        hora_str: str,
        telefone: Optional[str] = None,
    ) -> tuple[bool, str]:
        """Notifica o n8n que um novo atendimento foi criado."""
        payload = {
            "atendimento_id": atendimento_id,
            "modalidade": modalidade,
            "empresa": empresa,
            "data": data_str,
            "hora": hora_str,
        }
        # LGPD: nome e telefone são PII — enviar apenas se necessário para o workflow
        if telefone:
            payload["telefone"] = telefone
        if nome:
            payload["nome_paciente"] = nome

        return self.trigger(N8N_EVENT_ATENDIMENTO_CRIADO, payload)

    def trigger_lembrete(
        self,
        atendimento_id: int,
        nome: str,
        data_str: str,
        hora_str: str,
        telefone: Optional[str] = None,
    ) -> tuple[bool, str]:
        """Dispara lembrete de agendamento (D-1)."""
        payload = {
            "atendimento_id": atendimento_id,
            "nome_paciente": nome,
            "data": data_str,
            "hora": hora_str,
        }
        if telefone:
            payload["telefone"] = telefone

        return self.trigger(N8N_EVENT_LEMBRETE, payload)

    def trigger_relatorio_semanal(self, stats: Dict[str, Any]) -> tuple[bool, str]:
        """Dispara geração de relatório semanal."""
        return self.trigger(N8N_EVENT_RELATORIO_SEMANAL, {"stats": stats})

    def trigger_status_changed(
        self,
        atendimento_id: int,
        status_anterior: str,
        novo_status: str,
    ) -> tuple[bool, str]:
        """Notifica mudança de status de atendimento."""
        return self.trigger(N8N_EVENT_STATUS_CHANGED, {
            "atendimento_id": atendimento_id,
            "status_anterior": status_anterior,
            "novo_status": novo_status,
        })

    def test_connection(self) -> tuple[bool, str]:
        """Testa a conectividade com o servidor n8n (endpoint de health check)."""
        if not self.is_configured:
            return False, "URL do n8n não configurada."

        # Usa um endpoint de teste específico ou tenta o primeiro disponível
        try:
            response = requests.get(
                url=self._base_url.replace("/webhook", "/healthz"),
                timeout=5,
                headers=self._build_headers(),
            )
            if response.status_code < 500:
                return True, f"n8n acessível (HTTP {response.status_code})"
            return False, f"n8n retornou erro: HTTP {response.status_code}"
        except requests.Timeout:
            return False, "Timeout ao conectar com n8n."
        except requests.ConnectionError:
            return False, "Não foi possível conectar ao servidor n8n."
        except Exception as e:
            return False, f"Erro: {str(e)[:100]}"


# Singleton global
n8n_service = N8NService()
