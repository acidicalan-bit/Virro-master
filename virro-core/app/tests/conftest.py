import os
from pathlib import Path

os.environ["VIRRO_ENV"] = "test"
os.environ["VIRRO_TENANT_API_KEYS"] = '{"tenant-a":"test-key-a","tenant-b":"test-key-b"}'
os.environ["VIRRO_FINGERPRINT_KEY"] = "test-fingerprint-key-not-for-production"
os.environ["DATABASE_URL"] = "sqlite:///./virro-core-test.db"
Path("virro-core-test.db").unlink(missing_ok=True)

import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine
from app.main import app

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def headers():
    return {"X-API-Key": "test-key-a", "X-Tenant-ID": "tenant-a"}

@pytest.fixture
def tenant_b_headers():
    return {"Authorization": "Bearer test-key-b", "X-Tenant-ID": "tenant-b"}
