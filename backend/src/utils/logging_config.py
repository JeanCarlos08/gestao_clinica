"""Structured logging configuration for Clínica IA."""

import logging
import os
import sys


def setup_logging():
    """Configure structured logging for the application."""
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    fmt = os.getenv("LOG_FORMAT", "text")  # "text" or "json"

    root = logging.getLogger()
    root.setLevel(getattr(logging, level, logging.INFO))

    handler = logging.StreamHandler(sys.stdout)

    if fmt == "json":
        import json as _json

        class JSONFormatter(logging.Formatter):
            def format(self, record):
                return _json.dumps({
                    "level": record.levelname,
                    "logger": record.name,
                    "message": record.getMessage(),
                    "module": getattr(record, "module", ""),
                    "funcName": getattr(record, "funcName", ""),
                    "lineno": record.lineno,
                })

        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))

    root.handlers = [handler]

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
