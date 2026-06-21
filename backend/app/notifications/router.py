import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.notifications.repository import FamilyContactRepository, LinkTokenRepository
from app.notifications.schemas import ContactRead, LinkRead
from app.notifications.service import NotificationService
from app.notifications.telegram import TelegramClient

router = APIRouter(prefix="/family", tags=["family"])


def get_notification_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    settings = get_settings()
    return NotificationService(
        FamilyContactRepository(db),
        LinkTokenRepository(db),
        TelegramClient(settings.telegram_bot_token),
        settings,
    )


@router.post("/link", response_model=LinkRead)
async def create_link(
    current: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> LinkRead:
    data = await service.create_link(current.id)
    return LinkRead(**data)


@router.get("/contacts", response_model=list[ContactRead])
async def list_contacts(
    current: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> list[ContactRead]:
    contacts = await service.list_contacts(current.id)
    return [ContactRead.model_validate(c) for c in contacts]


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> None:
    deleted = await service.delete_contact(current.id, contact_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="contact not found"
        )
