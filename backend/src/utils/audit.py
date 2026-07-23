import json
import os
from datetime import datetime, UTC
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG = LOG_DIR / "audit.log"


def log_event(event_type: str, details: dict) -> None:
    """Registra um evento de auditoria em formato JSON lines."""
    entry = {
        # Use timestamp com timezone UTC e sufixo 'Z' (RFC 3339)
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "event_type": event_type,
        "details": details,
    }

    with open(AUDIT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_events(limit: int = 100) -> list:
    """Lê os últimos `limit` eventos do log de auditoria."""
    if not AUDIT_LOG.exists():
        return []

    with open(AUDIT_LOG, "r", encoding="utf-8") as f:
        lines = f.readlines()[-limit:]

    events = []
    for line in lines:
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except (json.JSONDecodeError, ValueError):
            continue
    return events

