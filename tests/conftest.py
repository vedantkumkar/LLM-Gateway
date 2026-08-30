import os
import pytest

os.environ["DATABASE_URL"] = "sqlite:///./test_gateway.db"
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["RATE_LIMIT_BACKEND"] = "memory"
os.environ["PII_ENGINE"] = "auto"

from fastapi.testclient import TestClient  # noqa: E402

from app.database.database import Base, engine, seed_default_policies, seed_default_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.auth.authentication import _supabase_identity_cache  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    _supabase_identity_cache.clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_default_policies()
    seed_default_settings()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_headers():
    return {"Authorization": "Bearer developer-demo-token"}
