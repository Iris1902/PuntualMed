from fastapi import APIRouter

from app.ai.router import router as ai_router
from app.api import health
from app.meds.router import router as meds_router
from app.notifications.router import router as family_router
from app.reminders.router import router as reminders_router
from app.symptoms.router import router as symptoms_router
from app.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(ai_router)
api_router.include_router(users_router)
api_router.include_router(meds_router)
api_router.include_router(reminders_router)
api_router.include_router(symptoms_router)
api_router.include_router(family_router)
