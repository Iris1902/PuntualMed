import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_database_url(monkeypatch):
    # Arrange
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    # Act
    settings = Settings(_env_file=None)
    # Assert
    assert settings.database_url == "postgresql+asyncpg://u:p@localhost:5432/db"
    assert settings.api_v1_prefix == "/api/v1"


def test_settings_requires_database_url(monkeypatch):
    # Arrange: sin DATABASE_URL debe fallar al instanciar (fail fast)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    # Act / Assert
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
