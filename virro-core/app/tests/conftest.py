import os
from pathlib import Path

os.environ["VIRRO_ENV"] = "test"
os.environ["VIRRO_API_KEY"] = "test-key-not-for-production"
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
    return {"X-API-Key": "test-key-not-for-production"}
