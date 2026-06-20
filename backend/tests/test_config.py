import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_database_url(monkeypatch):
    # Arrange
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    # Act
    settings = Settings(_env_file=None)
    # Assert
    assert settings.database_url == "postgresql+asyncpg://u:p@localhost:5432/db"
    assert settings.api_v1_prefix == "/api/v1"


def test_settings_requires_database_url(monkeypatch):
    # Arrange: sin DATABASE_URL debe fallar al instanciar (fail fast)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    # Act / Assert
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_rejects_non_async_driver(monkeypatch):
    # Arrange: un DATABASE_URL con driver sincrono debe fallar al arrancar,
    # con un mensaje claro (fail fast, fail loud) en vez de reventar en runtime
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    # Act / Assert
    with pytest.raises(ValidationError, match=r"postgresql\+asyncpg"):
        Settings(_env_file=None)


def test_settings_requires_supabase_jwt_secret(monkeypatch):
    # Arrange: sin el secret JWT debe fallar al instanciar (fail fast)
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    # Act / Assert
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_rejects_empty_supabase_jwt_secret(monkeypatch):
    # Arrange: un secret vacio no sirve para verificar tokens
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "   ")
    # Act / Assert
    with pytest.raises(ValidationError, match="vacio"):
        Settings(_env_file=None)


def test_settings_requires_supabase_url(monkeypatch):
    # Sin la URL del proyecto no se puede construir el JWKS -> fail fast
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-jwt-secret-with-at-least-32-bytes")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_rejects_non_https_supabase_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-jwt-secret-with-at-least-32-bytes")
    monkeypatch.setenv("SUPABASE_URL", "http://insecure.supabase.co")
    with pytest.raises(ValidationError, match="https"):
        Settings(_env_file=None)


def test_settings_derives_jwks_url_and_issuer(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-jwt-secret-with-at-least-32-bytes")
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co/")
    settings = Settings(_env_file=None)
    assert settings.supabase_url == "https://abc.supabase.co"
    assert settings.supabase_jwks_url == "https://abc.supabase.co/auth/v1/.well-known/jwks.json"
    assert settings.supabase_issuer == "https://abc.supabase.co/auth/v1"
