"""
Simple Rate Limiter para proteção contra abuso.

Sem dependências externas — usa cache em memória.
"""

from datetime import datetime, timedelta, UTC
from collections import defaultdict
from typing import Dict, Tuple


class SimpleRateLimiter:
    """Rate limiter baseado em IP e endpoint."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, client_ip: str, endpoint: str = "") -> Tuple[bool, Dict]:
        key = f"{client_ip}:{endpoint}" if endpoint else client_ip
        now = datetime.now(UTC)
        cutoff = now - timedelta(seconds=self.window_seconds)

        self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]

        if len(self.requests[key]) >= self.max_requests:
            return False, {
                "remaining": 0,
                "reset_in": (self.requests[key][0] + timedelta(seconds=self.window_seconds) - now).total_seconds(),
            }

        self.requests[key].append(now)
        return True, {
            "remaining": self.max_requests - len(self.requests[key]),
            "limit": self.max_requests,
        }

    def cleanup(self):
        cutoff = datetime.now(UTC) - timedelta(seconds=self.window_seconds * 10)
        for key in list(self.requests.keys()):
            self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
            if not self.requests[key]:
                del self.requests[key]


_rate_limiter = None


def get_rate_limiter() -> SimpleRateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = SimpleRateLimiter(max_requests=100, window_seconds=3600)
    return _rate_limiter
