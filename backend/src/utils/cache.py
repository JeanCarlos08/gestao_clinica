"""Simple in-memory cache with TTL for expensive queries."""

import time
from typing import Any, Optional
from functools import wraps

_cache: dict[str, tuple[float, int, Any]] = {}


def cached(ttl_seconds: int = 300):
    """Decorator that caches function results for *ttl_seconds*."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"{fn.__module__}.{fn.__qualname__}:{args}:{kwargs}"
            now = time.time()
            if key in _cache:
                ts, ttl, val = _cache[key]
                if now - ts < ttl:
                    return val
            result = fn(*args, **kwargs)
            _cache[key] = (now, ttl_seconds, result)
            return result
        return wrapper
    return decorator


def cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry:
        ts, ttl, val = entry
        if time.time() - ts < ttl:
            return val
    return None


def cache_set(key: str, value: Any, ttl: int = 300):
    _cache[key] = (time.time(), ttl, value)


def cache_clear():
    _cache.clear()
