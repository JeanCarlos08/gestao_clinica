"""
Simple Rate Limiter para proteção contra abuso

Sem dependências externas - usa cache em memória.
"""

from datetime import datetime, timedelta, UTC
from collections import defaultdict
from typing import Dict, Tuple


class SimpleRateLimiter:
    """Rate limiter baseado em IP e endpoint."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        """
        Initialize.
        
        Args:
            max_requests: Número máximo de requisições por window
            window_seconds: Tamanho da janela de tempo em segundos
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)  # {ip: [timestamps]}
    
    def is_allowed(self, client_ip: str, endpoint: str = "") -> Tuple[bool, Dict]:
        """
        Verifica se requisição é permitida.
        
        Args:
            client_ip: IP do cliente
            endpoint: Endpoint (opcional, para rate limit por endpoint)
        
        Returns:
            (allowed: bool, info: dict)
        """
        key = f"{client_ip}:{endpoint}" if endpoint else client_ip
        now = datetime.now(UTC)
        cutoff = now - timedelta(seconds=self.window_seconds)
        
        # Limpar timestamps antigos
        self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
        
        # Verificar limite
        if len(self.requests[key]) >= self.max_requests:
            return False, {
                "remaining": 0,
                "reset_in": (self.requests[key][0] + timedelta(seconds=self.window_seconds) - now).total_seconds()
            }
        
        # Registrar requisição
        self.requests[key].append(now)
        
        return True, {
            "remaining": self.max_requests - len(self.requests[key]),
            "limit": self.max_requests
        }
    
    def cleanup(self):
        """Remove entradas antigas (executar periodicamente)."""
        cutoff = datetime.now(UTC) - timedelta(seconds=self.window_seconds * 10)
        
        for key in list(self.requests.keys()):
            self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
            if not self.requests[key]:
                del self.requests[key]


# Instância global
_rate_limiter = None


def get_rate_limiter() -> SimpleRateLimiter:
    """Retorna instância singleton."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = SimpleRateLimiter(
            max_requests=100,      # 100 requisições
            window_seconds=3600    # por hora
        )
    return _rate_limiter


# Middleware para Flask
def setup_rate_limiting(app, rate_limiter: SimpleRateLimiter = None):
    """
    Setup rate limiting no Flask app.
    
    Uso:
        from utils.rate_limiter import get_rate_limiter, setup_rate_limiting
        limiter = get_rate_limiter()
        setup_rate_limiting(app, limiter)
    """
    from flask import request
    
    limiter = rate_limiter or get_rate_limiter()
    
    @app.before_request
    def check_rate_limit():
        client_ip = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
        endpoint = request.endpoint or request.path
        
        allowed, info = limiter.is_allowed(client_ip, endpoint)
        
        if not allowed:
            return {
                "error": "Rate limit exceeded",
                "remaining": info["remaining"],
                "reset_in_seconds": int(info["reset_in"])
            }, 429
