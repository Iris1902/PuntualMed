import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.notifications.alerts import poll_telegram_once, send_missed_alerts
from app.notifications.repository import FamilyContactRepository
from app.notifications.service import NotificationService
from app.notifications.telegram import TelegramClient
from app.reminders.repository import IntakeRepository
from app.reminders.worker import mark_missed_intakes

logger = logging.getLogger(__name__)


async def run_missed_job() -> None:
    # Job del scheduler: marca las tomas vencidas, notifica a familiares y persiste.
    settings = get_settings()
    session_factory = get_session_factory()
    async with session_factory() as session:
        repo = IntakeRepository(session)
        await mark_missed_intakes(repo, datetime.now(UTC), settings.missed_grace_minutes)
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
        scheduler.add_job(
            run_missed_job, "interval", minutes=settings.missed_scan_interval_minutes
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
    # CORS para clientes navegador (la app web de Expo). Bearer token, sin cookies,
    # por eso allow_credentials=False (compatible con allow_origins=["*"]).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
