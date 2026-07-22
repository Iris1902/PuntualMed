import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.ai.router import router as ai_router  # IMPORTANTE: Importamos el router de la IA
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.notifications.alerts import poll_telegram_once, send_missed_alerts
from app.notifications.repository import FamilyContactRepository
from app.notifications.service import NotificationService
from app.notifications.telegram import TelegramClient
from app.reminders.repository import IntakeRepository
# Importación actualizada para incluir notify_pending_intakes
from app.reminders.worker import mark_missed_intakes, notify_pending_intakes

logger = logging.getLogger(__name__)


async def run_reminder_jobs() -> None:
    # Job del scheduler unificado: notifica al usuario, marca vencidas y alerta a familiares.
    settings = get_settings()
    session_factory = get_session_factory()
    
    async with session_factory() as session:
        repo = IntakeRepository(session)
        now = datetime.now(UTC)
        
        # 1. Notificar al paciente (Push Notification simulada por ahora)
        await notify_pending_intakes(repo, now)
        
        # 2. Marcar tomas como vencidas si pasaron el margen de gracia
        await mark_missed_intakes(repo, now, settings.missed_grace_minutes)
        
        # 3. Alertar a los familiares por Telegram sobre las tomas recién vencidas
        if settings.telegram_bot_token:
            contacts_repo = FamilyContactRepository(session)
            telegram = TelegramClient(settings.telegram_bot_token)
            await send_missed_alerts(repo, contacts_repo, telegram)
            
        await session.commit()


async def _poll_telegram_loop() -> None:
    # Bucle de long-polling de Telegram; una excepcion por iteracion no mata el loop.
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        return
    telegram = TelegramClient(token)
    session_factory = get_session_factory()
    offset = 0
    while True:
        try:
            async with session_factory() as session:
                contacts_repo = FamilyContactRepository(session)
                tokens_repo = _build_tokens_repo(session)
                service = NotificationService(
                    contacts_repo, tokens_repo, telegram, settings
                )
                offset = await poll_telegram_once(telegram, service, offset)
                await session.commit()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Error en poll_telegram_loop; reintentando")


def _build_tokens_repo(session):
    from app.notifications.repository import LinkTokenRepository

    return LinkTokenRepository(session)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Punto unico de arranque/cierre de recursos del proceso
    settings = get_settings()
    scheduler: AsyncIOScheduler | None = None
    poll_task: asyncio.Task | None = None

    if settings.worker_enabled:
        scheduler = AsyncIOScheduler()
        # Se actualiza el nombre del job a ejecutar
        scheduler.add_job(
            run_reminder_jobs, "interval", minutes=settings.missed_scan_interval_minutes
        )
        scheduler.start()

    if settings.telegram_bot_token:
        poll_task = asyncio.create_task(_poll_telegram_loop())

    try:
        yield
    finally:
        if poll_task is not None:
            poll_task.cancel()
            try:
                await poll_task
            except asyncio.CancelledError:
                pass
        if scheduler is not None:
            scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    # Factory: permite instanciar la app con config aislada en tests
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    
    # MODIFICADO: Cambiado allow_origins a ["*"] y allow_credentials=True 
    # para permitir el acceso libre del entorno móvil de Expo en desarrollo.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rutas base del sistema
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    
    # MODIFICADO: Agregamos el router de inteligencia artificial al servidor
    app.include_router(ai_router, prefix="/api")
    
    return app


app = create_app()