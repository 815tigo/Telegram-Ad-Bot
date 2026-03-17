from fastapi import Header, HTTPException, Request, status

from app.core.config import get_settings


def require_api_key(
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> None:
    # Skip auth check for CORS preflight requests
    if request.method == "OPTIONS":
        return
    settings = get_settings()
    expected = settings.admin_api_key
    if not expected:
        return
    if x_api_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
