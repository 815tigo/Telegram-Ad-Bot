from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import telegram_service
from app.db.database import get_db
from app.schemas import LoginStartRequest, LoginStatusResponse, LoginVerifyRequest
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status", response_model=LoginStatusResponse)
async def auth_status() -> LoginStatusResponse:
    is_authorized = await telegram_service.is_authorized()
    me = await telegram_service.get_me()
    return LoginStatusResponse(
        is_authorized=is_authorized,
        me_username=me["username"],
        me_phone=me["phone"],
    )


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def auth_start(payload: LoginStartRequest) -> dict[str, str]:
    try:
        await telegram_service.start_login(payload.phone_number)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"message": "Login code sent to Telegram"}


@router.post("/logout")
async def auth_logout(db: Session = Depends(get_db)) -> dict[str, str]:
    SettingsService.upsert_value(db, SettingsService.TELEGRAM_SESSION_KEY, "")
    await telegram_service.disconnect()
    await telegram_service.init_client(None)
    return {"message": "Logged out successfully"}


@router.post("/verify")
async def auth_verify(payload: LoginVerifyRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        authorized, state = await telegram_service.verify_login(payload.phone_number, payload.code, payload.password)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not authorized and state == "password_required":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA password required")

    if not authorized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authorization failed")

    session_string = await telegram_service.export_session()
    SettingsService.upsert_value(db, SettingsService.TELEGRAM_SESSION_KEY, session_string)
    return {"message": "Telegram user account authorized successfully"}
