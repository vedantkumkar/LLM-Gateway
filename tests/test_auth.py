from app.api import state
from app.config import get_settings
from app.database.database import SessionLocal
from app.database.models import UserProfile

TEST_BEARER = "test-bearer-token-value"
TEST_PUBLISHABLE_KEY = "test-publishable-key-value"


def test_unauthorized_chat_request(client):
    response = client.post("/api/v1/chat", json={"message": "Hello", "model": "internal-secure-llm"})

    assert response.status_code == 401


def test_demo_auth_still_works(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer employee-demo-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "employee"


def test_supabase_missing_token_returns_401(client, monkeypatch, caplog):
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    get_settings.cache_clear()
    state.get_gateway_service.cache_clear()
    state.get_rate_limiter.cache_clear()

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert "AUTH_DIAG missing_bearer_token" in caplog.text
    get_settings.cache_clear()


def test_supabase_config_missing_returns_safe_401_and_diagnostic(client, monkeypatch, caplog):
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {TEST_BEARER}"})

    assert response.status_code == 401
    assert "AUTH_DIAG supabase_config_missing url_present=False key_present=False" in caplog.text
    assert TEST_BEARER not in caplog.text
    get_settings.cache_clear()


def test_supabase_valid_user_bootstraps_employee_profile(client, monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "supabase-user-1", "email": "new.user@example.com", "user_metadata": {"name": "New User"}}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer access-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "employee"
    with SessionLocal() as db:
        profile = db.get(UserProfile, "supabase-user-1")
        assert profile is not None
        assert profile.role == "employee"
    get_settings.cache_clear()


def test_invalid_supabase_token_returns_401(client, monkeypatch, caplog):
    class FakeResponse:
        status_code = 401

        def json(self):
            return {"message": "expired"}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", TEST_PUBLISHABLE_KEY)
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {TEST_BEARER}"})

    assert response.status_code == 401
    assert "AUTH_DIAG supabase_user_rejected status=401" in caplog.text
    assert TEST_BEARER not in caplog.text
    assert TEST_PUBLISHABLE_KEY not in caplog.text
    get_settings.cache_clear()


def test_supabase_network_timeout_returns_safe_401(client, monkeypatch, caplog):
    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            import httpx

            raise httpx.ConnectTimeout("timed out")

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", TEST_PUBLISHABLE_KEY)
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {TEST_BEARER}"})

    assert response.status_code == 401
    assert "AUTH_DIAG supabase_network_error error_type=ConnectTimeout" in caplog.text
    assert TEST_BEARER not in caplog.text
    assert TEST_PUBLISHABLE_KEY not in caplog.text
    get_settings.cache_clear()


def test_client_metadata_cannot_self_assign_role(client, monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "id": "role-claim-user",
                "email": "role.claim@example.com",
                "user_metadata": {"name": "Role Claim", "role": "admin"},
            }

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    monkeypatch.delenv("BOOTSTRAP_ADMIN_EMAILS", raising=False)
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer access-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "employee"
    get_settings.cache_clear()


def test_bootstrap_admin_email_creates_admin(client, monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "supabase-admin-1", "email": "admin@company.com"}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAILS", "admin@company.com")
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer access-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    get_settings.cache_clear()


def test_suspended_supabase_user_rejected(client, monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "suspended-user", "email": "suspended@example.com"}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    with SessionLocal() as db:
        db.add(
            UserProfile(
                id="suspended-user",
                email="suspended@example.com",
                name="Suspended User",
                role="employee",
                department="Operations",
                status="suspended",
            )
        )
        db.commit()

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    get_settings.cache_clear()

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer access-token"})

    assert response.status_code == 403
    get_settings.cache_clear()


def test_supabase_identity_cache_avoids_duplicate_remote_validation(client, monkeypatch):
    calls = {"count": 0}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "cached-user", "email": "cached@example.com"}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            calls["count"] += 1
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    get_settings.cache_clear()

    headers = {"Authorization": "Bearer cached-token"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert client.get("/api/v1/models", headers=headers).status_code == 200
    assert calls["count"] == 1
    get_settings.cache_clear()


def test_supabase_identity_cache_does_not_bypass_suspended_profile(client, monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "cached-suspend-user", "email": "cached.suspend@example.com"}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers):
            return FakeResponse()

    import app.auth.authentication as auth_module

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setenv("AUTH_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable")
    get_settings.cache_clear()

    headers = {"Authorization": "Bearer cached-suspend-token"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    with SessionLocal() as db:
        profile = db.get(UserProfile, "cached-suspend-user")
        assert profile is not None
        profile.status = "suspended"
        db.commit()

    assert client.get("/api/v1/models", headers=headers).status_code == 403
    get_settings.cache_clear()
