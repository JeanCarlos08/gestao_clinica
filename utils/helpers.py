"""
Funções utilitárias do sistema mvpdepsicologia.

Helpers puros reutilizáveis por qualquer camada do sistema.
Sem dependência de Streamlit, banco ou serviços externos.
"""

import base64
import hashlib
import re
from datetime import date, datetime, time
from typing import Any, Optional


# ─────────────────────────────────────────────────────────────
# Formatação de datas e horas
# ─────────────────────────────────────────────────────────────

def format_date_br(d: Optional[date]) -> str:
    """Converte date para formato brasileiro DD/MM/AAAA."""
    if d is None:
        return "-"
    if isinstance(d, str):
        try:
            d = datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            return d
    return d.strftime("%d/%m/%Y")


def format_time_br(t: Optional[time]) -> str:
    """Converte time para formato HH:MM."""
    if t is None:
        return "-"
    if isinstance(t, str):
        return t[:5]  # Pega apenas HH:MM
    return t.strftime("%H:%M")


def format_datetime_br(dt: Optional[datetime]) -> str:
    """Converte datetime para formato brasileiro DD/MM/AAAA HH:MM."""
    if dt is None:
        return "-"
    return dt.strftime("%d/%m/%Y %H:%M")


# ─────────────────────────────────────────────────────────────
# Formatação de dados
# ─────────────────────────────────────────────────────────────

def format_file_size(size_bytes: int) -> str:
    """Formata tamanho em bytes para formato legível (KB, MB, GB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024**2):.1f} MB"
    return f"{size_bytes / (1024**3):.1f} GB"


def mask_sensitive(value: str, visible_chars: int = 4) -> str:
    """
    Mascara dados sensíveis para exibição.
    Exemplo: "12345678901" → "1234*******"
    """
    if not value:
        return ""
    visible = value[:visible_chars]
    masked = "*" * max(0, len(value) - visible_chars)
    return visible + masked


def sanitize_filename(filename: str) -> str:
    """Remove caracteres inválidos de um nome de arquivo."""
    # Mantém apenas alfanuméricos, hífen, underscore e ponto
    clean = re.sub(r"[^\w\-_\.]", "_", filename)
    return clean[:255]  # Limite de filesystem


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Trunca texto longo para exibição em tabelas/cards."""
    if not text or len(text) <= max_length:
        return text or ""
    return text[:max_length - len(suffix)] + suffix


# ─────────────────────────────────────────────────────────────
# Hashing (para autenticação simples)
# ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Retorna hash SHA-256 da senha. NÃO usar em produção com múltiplos usuários — usar bcrypt."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verifica senha contra hash SHA-256."""
    return hash_password(password) == hashed


# ─────────────────────────────────────────────────────────────
# Base64 (para imagens embarcadas)
# ─────────────────────────────────────────────────────────────

def image_to_base64(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """Converte bytes de imagem para string base64 (para embed em HTML/CSS)."""
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def base64_to_bytes(b64_string: str) -> bytes:
    """Decodifica string base64 para bytes."""
    # Remove prefixo data:... se presente
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    return base64.b64decode(b64_string)


# ─────────────────────────────────────────────────────────────
# Google Docs — Helpers
# ─────────────────────────────────────────────────────────────

def extract_google_doc_id(url_or_id: str) -> Optional[str]:
    """
    Extrai o ID de um Google Doc a partir de uma URL completa ou ID direto.

    Exemplos de URL aceitos:
    - https://docs.google.com/document/d/DOC_ID/edit
    - https://docs.google.com/document/d/DOC_ID/view
    - DOC_ID (direto)
    """
    if not url_or_id:
        return None
    # Se é uma URL do Google Docs
    match = re.search(r"/document/d/([a-zA-Z0-9_-]+)", url_or_id)
    if match:
        return match.group(1)
    # Se parece ser um ID direto (alfanumérico com hífens e underscores)
    if re.match(r"^[a-zA-Z0-9_-]{20,}$", url_or_id):
        return url_or_id
    return None


def build_google_doc_embed_url(doc_id: str) -> str:
    """Constrói a URL de embed (preview) de um Google Doc."""
    return f"https://docs.google.com/document/d/{doc_id}/preview"


def build_google_doc_view_url(doc_id: str) -> str:
    """Constrói a URL pública de visualização de um Google Doc."""
    return f"https://docs.google.com/document/d/{doc_id}/view"


# ─────────────────────────────────────────────────────────────
# WhatsApp — Helpers
# ─────────────────────────────────────────────────────────────

def build_whatsapp_link(phone: str, message: str = "") -> str:
    """
    Constrói link wa.me para abertura direta do WhatsApp.

    Args:
        phone: Número com DDD (apenas dígitos, com 55 do Brasil se internacional).
        message: Mensagem pré-preenchida (opcional).

    Returns:
        URL wa.me formatada.
    """
    # Remove tudo que não é dígito
    digits = re.sub(r"\D", "", phone)
    # Adiciona código do Brasil se não tem código internacional
    if len(digits) <= 11:
        digits = f"55{digits}"

    if message:
        from urllib.parse import quote
        encoded_msg = quote(message, safe="")
        return f"https://wa.me/{digits}?text={encoded_msg}"

    return f"https://wa.me/{digits}"


# ─────────────────────────────────────────────────────────────
# Dicionários e listas
# ─────────────────────────────────────────────────────────────

def safe_get(d: dict, *keys: str, default: Any = None) -> Any:
    """Navega em dicionários aninhados com segurança."""
    current = d
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key, default)
    return current


def flatten_dict(d: dict, separator: str = "_", prefix: str = "") -> dict:
    """Achata dicionário aninhado em dicionário flat."""
    items: dict = {}
    for k, v in d.items():
        new_key = f"{prefix}{separator}{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, separator, new_key))
        else:
            items[new_key] = v
    return items
