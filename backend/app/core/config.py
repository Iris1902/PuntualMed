from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Configuracion unica de la app, cargada desde variables de entorno
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "PuntualMed"
    api_v1_prefix: str = "/api/v1"
    database_url: str  # requerido: si falta, la app no arranca


@lru_cache
def get_settings() -> Settings:
    # Cachea la instancia para no releer el entorno en cada acceso
    return Settings()
