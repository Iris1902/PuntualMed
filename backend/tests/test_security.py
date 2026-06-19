import time
import uuid

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import get_settings
from app.core.security import (
    CurrentUser,
    decode_supabase_token,
    get_current_user,
)

# Secret de prueba >= 32 bytes (minimo HS256 de RFC 7518); debe coincidir con conftest
_SECRET = "test-jwt-secret-with-at-least-32-bytes"


def _make_token(sub: str, exp_delta: int = 3600, aud: str = "authenticated") -> str:
    payload = {
        "sub": sub,
        "aud": aud,
        "email": "iris@example.com",
        "exp": int(time.time()) + exp_delta,
    }
    return jwt.encode(payload, _SECRET, algorithm="HS256")


def test_decode_valid_token_returns_claims():
    sub = str(uuid.uuid4())
    payload = decode_supabase_token(_make_token(sub), _SECRET)
    assert payload["sub"] == sub


def test_decode_expired_token_raises():
    with pytest.raises(jwt.PyJWTError):
        decode_supabase_token(_make_token(str(uuid.uuid4()), exp_delta=-10), _SECRET)


def test_decode_bad_signature_raises():
    with pytest.raises(jwt.PyJWTError):
        decode_supabase_token(
            _make_token(str(uuid.uuid4())), "wrong-secret-with-at-least-32-bytes-too"
        )


async def test_get_current_user_valid():
    get_settings.cache_clear()
    sub = str(uuid.uuid4())
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=_make_token(sub))
    user = await get_current_user(creds)
    assert isinstance(user, CurrentUser)
    assert user.id == uuid.UUID(sub)
    assert user.email == "iris@example.com"


async def test_get_current_user_missing_credentials_raises_401():
    with pytest.raises(HTTPException) as exc:
        await get_current_user(None)
    assert exc.value.status_code == 401


async def test_get_current_user_invalid_token_raises_401():
    get_settings.cache_clear()
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-jwt")
    with pytest.raises(HTTPException) as exc:
        await get_current_user(creds)
    assert exc.value.status_code == 401


async def test_get_current_user_non_uuid_sub_raises_401():
    # Token con firma valida pero sub que no es UUID -> 401, no 500
    get_settings.cache_clear()
    token = jwt.encode(
        {"sub": "not-a-uuid", "aud": "authenticated", "exp": int(time.time()) + 3600},
        _SECRET,
        algorithm="HS256",
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc:
        await get_current_user(creds)
    assert exc.value.status_code == 401
