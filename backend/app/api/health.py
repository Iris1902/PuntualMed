from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    # Liveness: confirma que el proceso responde
    return {"status": "ok"}
