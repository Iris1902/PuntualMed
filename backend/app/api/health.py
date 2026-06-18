from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    # Liveness: confirma que el proceso responde
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)) -> dict[str, str]:  # noqa: B008
    # Readiness: verifica conectividad real con la base de datos
    try:
        await db.execute(text("SELECT 1"))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database unavailable",
        ) from err
    return {"database": "ok"}
