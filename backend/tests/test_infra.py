"""Testes para as melhorias de infraestrutura: cache, run_sync, upload validation."""

import asyncio
import time

import pytest

from utils.cache import cache_get, cache_set, cache_clear, cached


class TestCache:
    def setup_method(self):
        cache_clear()

    def test_set_and_get(self):
        cache_set("k1", "v1", ttl=60)
        assert cache_get("k1") == "v1"

    def test_get_missing_key(self):
        assert cache_get("nonexistent") is None

    def test_ttl_expiration(self):
        cache_set("k2", "v2", ttl=0)
        time.sleep(0.01)
        assert cache_get("k2") is None

    def test_clear(self):
        cache_set("k3", "v3", ttl=60)
        cache_clear()
        assert cache_get("k3") is None

    def test_overwrite(self):
        cache_set("k4", "first", ttl=60)
        cache_set("k4", "second", ttl=60)
        assert cache_get("k4") == "second"


class TestCachedDecorator:
    def setup_method(self):
        cache_clear()

    def test_caches_result(self):
        call_count = 0

        @cached(ttl_seconds=60)
        def expensive(x):
            nonlocal call_count
            call_count += 1
            return x * 2

        assert expensive(5) == 10
        assert expensive(5) == 10
        assert call_count == 1

    def test_different_args_different_cache(self):
        call_count = 0

        @cached(ttl_seconds=60)
        def fn(x):
            nonlocal call_count
            call_count += 1
            return x

        fn(1)
        fn(2)
        assert call_count == 2


class TestRunSync:
    def test_run_sync_calls_function(self):
        from infrastructure.api.routers.deps import run_sync

        def blocking_fn(a, b):
            return a + b

        result = asyncio.get_event_loop().run_until_complete(
            run_sync(blocking_fn, 3, 4)
        )
        assert result == 7

    def test_run_sync_with_kwargs(self):
        from infrastructure.api.routers.deps import run_sync

        def fn(name, prefix="Hello"):
            return f"{prefix}, {name}!"

        result = asyncio.get_event_loop().run_until_complete(
            run_sync(fn, "World", prefix="Hi")
        )
        assert result == "Hi, World!"


class TestUploadValidation:
    def test_sanitize_clean(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        assert _sanitize_filename("doc.pdf") == "doc.pdf"

    def test_sanitize_path_traversal(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        result = _sanitize_filename("../../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_sanitize_special_chars(self):
        from infrastructure.api.routers.upload import _sanitize_filename
        result = _sanitize_filename("file (1) [copy].pdf")
        assert "(" not in result
        assert "[" not in result
        assert result.endswith(".pdf")


class TestHealthCheck:
    def test_health_check(self):
        from infrastructure.api.routers.health import health_check
        result = asyncio.get_event_loop().run_until_complete(health_check())
        assert result["status"] == "ok"
        assert "version" in result
        assert "uptime_seconds" in result


class TestRepoDependencies:
    def test_get_atendimento_repo(self):
        from infrastructure.api.routers.repo_deps import get_atendimento_repo
        from core.repositories.repositories import AtendimentoRepository
        repo = get_atendimento_repo()
        assert isinstance(repo, AtendimentoRepository)

    def test_get_arquivo_repo(self):
        from infrastructure.api.routers.repo_deps import get_arquivo_repo
        from core.repositories.repositories import ArquivoRepository
        repo = get_arquivo_repo()
        assert isinstance(repo, ArquivoRepository)

    def test_get_preferences_repo(self):
        from infrastructure.api.routers.repo_deps import get_preferences_repo
        from core.repositories.repositories import PreferencesRepository
        repo = get_preferences_repo()
        assert isinstance(repo, PreferencesRepository)

    def test_singletons_are_same(self):
        from infrastructure.api.routers.repo_deps import get_atendimento_repo
        r1 = get_atendimento_repo()
        r2 = get_atendimento_repo()
        assert r1 is r2
