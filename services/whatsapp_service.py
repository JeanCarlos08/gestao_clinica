"""
Serviço de WhatsApp do sistema mvpdepsicologia.

Fase 1 (atual): Links wa.me para abertura direta do WhatsApp Web/App.
Fase 2 (futuro): Evolution API via n8n para envio programático.

Uso:
    from services.whatsapp_service import whatsapp_service
    link = whatsapp_service.build_link("11999998888", "Olá, sua consulta é amanhã!")
"""

from typing import Optional

from utils.helpers import build_whatsapp_link
from utils.logger import get_logger

logger = get_logger(__name__)


class WhatsAppService:
    """
    Serviço de integração com WhatsApp.
    Fase 1: Links wa.me (sem API).
    Fase 2: Evolution API via n8n (futuro).
    """

    def build_link(self, phone: str, message: str = "") -> str:
        """
        Constrói link wa.me para abertura direta do WhatsApp.

        Args:
            phone: Número com DDD (apenas dígitos).
            message: Mensagem pré-preenchida (opcional).

        Returns:
            URL wa.me formatada.
        """
        link = build_whatsapp_link(phone, message)
        logger.info(f"WhatsApp link gerado para número com {len(phone)} dígitos.")
        return link

    def build_agendamento_message(
        self,
        nome: str,
        empresa: str,
        modalidade: str,
        data_str: str,
        hora_str: str,
    ) -> str:
        """
        Constrói mensagem padrão de confirmação de agendamento.

        Returns:
            Texto formatado para WhatsApp.
        """
        return (
            f"Olá, *{nome}*! 👋\n\n"
            f"Seu atendimento foi agendado com sucesso:\n"
            f"📋 *Tipo:* {modalidade}\n"
            f"🏢 *Empresa:* {empresa}\n"
            f"📅 *Data:* {data_str}\n"
            f"🕐 *Hora:* {hora_str}\n\n"
            f"Por favor, traga seus documentos e chegue com 10 minutos de antecedência. ✅"
        )

    def build_lembrete_message(
        self,
        nome: str,
        data_str: str,
        hora_str: str,
    ) -> str:
        """Constrói mensagem de lembrete D-1."""
        return (
            f"Olá, *{nome}*! 😊\n\n"
            f"Lembramos que você tem um atendimento *amanhã*:\n"
            f"📅 *Data:* {data_str}\n"
            f"🕐 *Hora:* {hora_str}\n\n"
            f"Até amanhã! 👍"
        )


# Singleton global
whatsapp_service = WhatsAppService()
