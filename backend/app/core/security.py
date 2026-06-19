import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_ALGORITHM = "HS256"
_AUDIENCE = "authenticated"
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    # Identidad derivada del JWT verificado de Supabase
    id: uuid.UUID
    email: str | None


def decode_supabase_token(token: str, secret: str) -> dict:
    # Verifica firma, expiracion y audience del token de Supabase
    return jwt.decode(
        token, secret, algorithms=[_ALGORITHM], audience=_AUDIENCE
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    # Contrato de auth: token valido -> CurrentUser; cualquier fallo -> 401
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing token"
        )
    settings = get_settings()
    try:
        payload = decode_supabase_token(
            credentials.credentials, settings.supabase_jwt_secret
        )
    except jwt.PyJWTError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        ) from err
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        )
    try:
        user_id = uuid.UUID(sub)
    except ValueError as err:
        # Un sub con firma valida pero formato no-UUID es un token invalido
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        ) from err
    return CurrentUser(id=user_id, email=payload.get("email"))
