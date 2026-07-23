"""Middleware stack — Request ID, Timing, Gzip, Structured Logging."""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Adds X-Request-ID to every request/response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Adds X-Response-Time header and logs slow requests."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Response-Time"] = f"{elapsed_ms}ms"

        if elapsed_ms > 500:
            logging.getLogger("slow_request").warning(
                "SLOW %s %s %.0fms",
                request.method,
                request.url.path,
                elapsed_ms,
            )
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every API request with structured fields."""

    _log = logging.getLogger("api.access")

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = round((time.perf_counter() - start) * 1000, 2)

        self._log.info(
            "%s %s %d %.0fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "elapsed_ms": elapsed,
                "request_id": getattr(request.state, "request_id", "-"),
                "client": request.client.host if request.client else "-",
            },
        )
        return response
