import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.models import ContactLinkToken, FamilyContact


class FamilyContactRepository:
    # Acceso a datos de contactos familiares. Una instancia por request.
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, contact: FamilyContact) -> FamilyContact:
        self._session.add(contact)
        await self._session.flush()
        return contact

    async def list_by_user(self, user_id: uuid.UUID) -> list[FamilyContact]:
        result = await self._session.execute(
            select(FamilyContact)
            .where(FamilyContact.user_id == user_id)
            .order_by(FamilyContact.created_at)
        )
        return list(result.scalars().all())

    async def get_for_user(
        self, contact_id: uuid.UUID, user_id: uuid.UUID
    ) -> FamilyContact | None:
        result = await self._session.execute(
            select(FamilyContact).where(
                FamilyContact.id == contact_id, FamilyContact.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, contact: FamilyContact) -> None:
        await self._session.delete(contact)
        await self._session.flush()


class LinkTokenRepository:
    # Acceso a datos de tokens de vinculacion. Una instancia por request.
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, token: ContactLinkToken) -> ContactLinkToken:
        self._session.add(token)
        await self._session.flush()
        return token

    async def get_by_token(self, token: str) -> ContactLinkToken | None:
        result = await self._session.execute(
            select(ContactLinkToken).where(ContactLinkToken.token == token)
        )
        return result.scalar_one_or_none()
