from fastapi import APIRouter

from app.api.deps import telegram_service
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", telegram_authorized=await telegram_service.is_authorized())
