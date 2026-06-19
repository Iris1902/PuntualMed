import uuid
from datetime import UTC, datetime

from app.core.security import CurrentUser, get_current_user
from app.users.models import Profile
from app.users.router import get_user_service
from app.users.service import UserService


class _FakeRepo:
    def __init__(self, seed: Profile | None = None) -> None:
        self._store: dict[uuid.UUID, Profile] = {}
        if seed is not None:
            self._store[seed.id] = seed

    async def get(self, user_id):
        return self._store.get(user_id)

    async def add(self, profile):
        self._store[profile.id] = profile
        return profile


_USER_ID = uuid.uuid4()


def _seed_profile() -> Profile:
    return Profile(
        id=_USER_ID,
        full_name="Iris",
        expo_push_token=None,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


def _override_auth():
    return CurrentUser(id=_USER_ID, email="iris@example.com")


async def test_get_me_returns_profile(app, client):
    repo = _FakeRepo(seed=_seed_profile())
    app.dependency_overrides[get_current_user] = _override_auth
    app.dependency_overrides[get_user_service] = lambda: UserService(repo)
    try:
        response = await client.get("/api/v1/users/me")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(_USER_ID)
    assert data["full_name"] == "Iris"


async def test_get_me_without_token_returns_401(app, client):
    # Sin override de auth y sin header Authorization -> 401
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


async def test_patch_me_updates_full_name(app, client):
    repo = _FakeRepo(seed=_seed_profile())
    app.dependency_overrides[get_current_user] = _override_auth
    app.dependency_overrides[get_user_service] = lambda: UserService(repo)
    try:
        response = await client.patch(
            "/api/v1/users/me", json={"full_name": "Iris Evinan"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["full_name"] == "Iris Evinan"
