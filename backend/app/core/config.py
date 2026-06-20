from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ASYNC_DRIVER_PREFIX = "postgresql+asyncpg://"


class Settings(BaseSettings):
    # Configuracion unica de la app, cargada desde variables de entorno
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "PuntualMed"
    api_v1_prefix: str = "/api/v1"
    database_url: str  # requerido: si falta, la app no arranca
    supabase_jwt_secret: str  # secret HS256 de Supabase para verificar JWTs
    supabase_url: str  # URL del proyecto Supabase, ej. https://<ref>.supabase.co
    app_timezone: str = "America/Guayaquil"  # zona para programar tomas (UTC-5)
    zhipu_api_key: str | None = None  # key de GLM/Zhipu; opcional hasta usar el LLM real

    @field_validator("database_url")
    @classmethod
    def validate_async_driver(cls, value: str) -> str:
        # La app es async de punta a punta: exige el driver asyncpg.
        # Si no, falla al arrancar con un mensaje claro en vez de reventar
        # en runtime con un ModuleNotFoundError de psycopg2.
        if not value.startswith(_ASYNC_DRIVER_PREFIX):
            raise ValueError(
                f"DATABASE_URL debe usar el driver async: {_ASYNC_DRIVER_PREFIX}..."
            )
        return value

    @field_validator("supabase_jwt_secret")
    @classmethod
    def validate_secret_not_empty(cls, value: str) -> str:
        # Un secret vacio no permite verificar firmas
        if not value.strip():
            raise ValueError("SUPABASE_JWT_SECRET no puede estar vacio")
        return value

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, value: str) -> str:
        # La URL del proyecto debe ser https; de ella derivamos JWKS e issuer.
        if not value.startswith("https://"):
            raise ValueError("SUPABASE_URL debe empezar con https://")
        return value.rstrip("/")

    @property
    def supabase_jwks_url(self) -> str:
        # Endpoint publico de llaves de firma de Supabase
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    @property
    def supabase_issuer(self) -> str:
        # Emisor esperado en el claim `iss` de los tokens de Supabase
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    # Cachea la instancia para no releer el entorno en cada acceso
    return Settings()
