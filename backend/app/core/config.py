from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ASYNC_DRIVER_PREFIX = "postgresql+asyncpg://"
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    # Configuracion unica de la app, cargada desde variables de entorno
    model_config = SettingsConfigDict(
        env_file=(_BACKEND_DIR / ".env", _REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PuntualMed"
    api_v1_prefix: str = "/api/v1"
    database_url: str  # requerido: si falta, la app no arranca
    supabase_url: str  # URL del proyecto Supabase, ej. https://<ref>.supabase.co
    app_timezone: str = "America/Guayaquil"  # zona para programar tomas (UTC-5)
    missed_grace_minutes: int = 60  # margen tras la hora antes de marcar una toma vencida
    missed_scan_interval_minutes: int = 15  # cada cuanto corre el worker
    worker_enabled: bool = True  # se desactiva en tests para no levantar el scheduler
    zhipu_api_key: str | None = None  # key de GLM/Zhipu; opcional hasta usar el LLM real
    gemini_api_key: str | None = None  # key de Google AI Studio para Gemini 1.5 Flash
    telegram_bot_token: str | None = None  # token de @BotFather; sin el, las alertas se desactivan
    # username del bot (sin @), para el deep link t.me/<username>
    telegram_bot_username: str | None = None
    link_token_ttl_minutes: int = 60  # validez del token de vinculacion familiar
    # Origenes permitidos por CORS (clientes navegador). "*" en dev; en prod se restringe.
    cors_allow_origins: str = "*"

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

    @property
    def cors_origins_list(self) -> list[str]:
        # "*" permite cualquier origen (dev); si no, lista separada por comas.
        if self.cors_allow_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    # Cachea la instancia para no releer el entorno en cada acceso
    return Settings()
