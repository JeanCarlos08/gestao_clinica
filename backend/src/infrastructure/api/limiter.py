"""Shared rate limiter instance.

Import this in any router to apply rate limits::

    from infrastructure.api.limiter import limiter

    @router.post("/endpoint")
    @limiter.limit("30/minute")
    async def my_endpoint(request: Request, ...):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
