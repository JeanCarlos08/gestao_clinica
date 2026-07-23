"""
Logger configurado para o sistema mvpdepsicologia.

Configura um logger com:
- Console handler (colorido em desenvolvimento)
- File handler com rotação automática (5MB, 3 backups)
- Formato profissional com timestamp, nível, módulo e mensagem

Uso:
    from utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Atendimento criado com sucesso.")
    logger.error("Falha ao conectar ao banco.", exc_info=True)
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from utils.constants import (
    LOG_DATE_FORMAT,
    LOG_FILE_BACKUP_COUNT,
    LOG_FILE_MAX_BYTES,
    LOG_FORMAT,
)


def _ensure_logs_dir() -> Path:
    """Garante que o diretório de logs exista."""
    # Resolve o path relativo ao root do projeto
    logs_dir = Path(__file__).resolve().parent.parent / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir


def _get_log_level() -> int:
    """Lê o nível de log das configurações (evita import circular)."""
    import os
    level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    return getattr(logging, level_str, logging.INFO)


# Guarda referência dos loggers já configurados para evitar handlers duplicados
_configured_loggers: set[str] = set()


def get_logger(name: str) -> logging.Logger:
    """
    Retorna um logger configurado para o módulo informado.

    Garante que handlers não sejam duplicados em reruns do Streamlit.

    Args:
        name: Nome do módulo, geralmente `__name__`.

    Returns:
        Logger configurado com handlers de console e arquivo.
    """
    logger = logging.getLogger(name)

    # Evita adicionar handlers duplicados (importante para processos que reexecutam o módulo)
    if name in _configured_loggers:
        return logger

    logger.setLevel(_get_log_level())
    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    # ── Console Handler ───────────────────────────────────────
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(_get_log_level())
    logger.addHandler(console_handler)

    # ── File Handler com Rotação ──────────────────────────────
    try:
        logs_dir = _ensure_logs_dir()
        file_handler = RotatingFileHandler(
            filename=logs_dir / "system.log",
            maxBytes=LOG_FILE_MAX_BYTES,
            backupCount=LOG_FILE_BACKUP_COUNT,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(_get_log_level())
        logger.addHandler(file_handler)

        # Handler separado apenas para erros
        error_handler = RotatingFileHandler(
            filename=logs_dir / "error.log",
            maxBytes=LOG_FILE_MAX_BYTES,
            backupCount=LOG_FILE_BACKUP_COUNT,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        logger.addHandler(error_handler)

    except Exception:
        # Se não conseguir criar o arquivo de log, continua apenas com console
        pass

    # Evita propagação para o root logger (evita logs duplicados)
    logger.propagate = False
    _configured_loggers.add(name)

    return logger
