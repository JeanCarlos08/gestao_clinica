"""Testes para os novos endpoints: batch, middleware, health detalhado."""

import asyncio
import json
from unittest.mock import MagicMock, AsyncMock, patch

import pytest


class TestBatchEndpoints:
    def test_batch_status_payload_model(self):
        from infrastructure.api.routers.atendimentos import BatchStatusPayload
        p = BatchStatusPayload(ids=[1, 2, 3], status="Concluído")
        assert len(p.ids) == 3
        assert p.status == "Concluído"

    def test_batch_delete_payload_model(self):
        from infrastructure.api.routers.atendimentos import BatchDeletePayload
        p = BatchDeletePayload(ids=[1, 2])
        assert len(p.ids) == 2


class TestMiddleware:
    def test_request_id_middleware_exists(self):
        from infrastructure.api.middleware import RequestIDMiddleware
        assert RequestIDMiddleware is not None

    def test_timing_middleware_exists(self):
        from infrastructure.api.middleware import TimingMiddleware
        assert TimingMiddleware is not None

    def test_structured_logging_middleware_exists(self):
        from infrastructure.api.middleware import StructuredLoggingMiddleware
        assert StructuredLoggingMiddleware is not None


class TestConnectionRetention:
    def test_cleanup_functions_exist(self):
        from infrastructure.connection import (
            cleanup_old_audit_logs,
            cleanup_old_login_attempts,
            get_table_counts,
        )
        assert callable(cleanup_old_audit_logs)
        assert callable(cleanup_old_login_attempts)
        assert callable(get_table_counts)


class TestRateLimiter:
    def test_shared_limiter_exists(self):
        from infrastructure.api.limiter import limiter
        assert limiter is not None

    def test_limiter_has_key_func(self):
        from infrastructure.api.limiter import limiter
        assert limiter._key_func is not None


class TestCacheModule:
    def test_cache_roundtrip(self):
        from utils.cache import cache_set, cache_get, cache_clear
        cache_clear()
        cache_set("test_key", {"data": [1, 2, 3]}, ttl=60)
        result = cache_get("test_key")
        assert result == {"data": [1, 2, 3]}

    def test_cache_different_keys(self):
        from utils.cache import cache_set, cache_get, cache_clear
        cache_clear()
        cache_set("a", 1, ttl=60)
        cache_set("b", 2, ttl=60)
        assert cache_get("a") == 1
        assert cache_get("b") == 2


class TestUploadFilename:
    def test_sanitize_dangerous(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        result = _sanitize_filename("a/b/c.pdf")
        assert "/" not in result
        # The dots themselves pass the regex but path traversal is neutralized
        result2 = _sanitize_filename("../../../etc/passwd")
        assert "/" not in result2
        assert ".." not in result2

    def test_sanitize_empty(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        result = _sanitize_filename("")
        assert result  # should not be empty

    def test_sanitize_long(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        result = _sanitize_filename("a" * 500 + ".pdf")
        assert len(result) <= 255


class TestRepoProtocols:
    def test_protocols_importable(self):
        from core.repositories.protocols import (
            AtendimentoRepoProtocol,
            ArquivoRepoProtocol,
            DocumentoRepoProtocol,
            AuditoriaRepoProtocol,
            PreferencesRepoProtocol,
            TemporaryPermissionRepoProtocol,
            UserRepoProtocol,
            ClinicConfigRepoProtocol,
        )
        # Just verify they can be imported
        assert AtendimentoRepoProtocol is not None
