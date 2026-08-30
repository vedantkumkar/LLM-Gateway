import builtins

from app.config import Settings
from app.database.database import _connect_args
from app.security.pii_detector import PIIDetector
from app.services.rate_limiter import InMemoryRateLimiter, build_rate_limiter


def test_default_local_mode_uses_sqlite_memory_and_mock():
    settings = Settings()

    assert settings.database_url.startswith("sqlite")
    assert settings.rate_limit_backend == "memory"
    assert settings.llm_provider == "mock"


def test_presidio_auto_falls_back_safely_when_unavailable(monkeypatch):
    import app.security.pii_detector as pii_module

    class BrokenAnalyzer:
        def __init__(self):
            raise RuntimeError("Presidio unavailable in test")

    def fake_import(name, *args, **kwargs):
        if name == "presidio_analyzer":
            class Module:
                AnalyzerEngine = BrokenAnalyzer

            return Module()
        return original_import(name, *args, **kwargs)

    original_import = builtins.__import__
    monkeypatch.setattr(builtins, "__import__", fake_import)

    detector = PIIDetector(engine_mode="auto")
    detections = detector.detect("Contact rahul.sharma@example.com")

    assert any(item.type == "EMAIL_ADDRESS" for item in detections)


def test_postgresql_connect_args_are_supported_without_live_database():
    assert _connect_args("postgresql+psycopg://user:password@postgres:5432/llm_gateway") == {}


def test_redis_auto_without_url_falls_back_to_memory():
    limiter = build_rate_limiter("auto", "", 60)

    assert isinstance(limiter, InMemoryRateLimiter)


def test_memory_rate_limit_enforces_limit():
    limiter = InMemoryRateLimiter(1)

    assert limiter.allow("user-1") is True
    assert limiter.allow("user-1") is False


def test_redis_backend_failure_is_strict(monkeypatch):
    import app.services.rate_limiter as limiter_module

    class BrokenRedis:
        @classmethod
        def from_url(cls, url, decode_responses):
            raise RuntimeError("redis unavailable")

    class FakeRedisModule:
        Redis = BrokenRedis

    original_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "redis":
            return FakeRedisModule
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    try:
        try:
            build_rate_limiter("redis", "rediss://example", 60)
        except RuntimeError as exc:
            assert "redis unavailable" in str(exc)
        else:
            raise AssertionError("Strict redis mode must not fall back to memory")
    finally:
        monkeypatch.setattr(builtins, "__import__", original_import)
