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


@lru_cache
def get_settings() -> Settings:
    # Cachea la instancia para no releer el entorno en cada acceso
    return Settings()
