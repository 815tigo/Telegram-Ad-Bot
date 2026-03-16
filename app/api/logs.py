from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import PostingLog, Reply
from app.schemas import PostingLogResponse, ReplyResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[PostingLogResponse])
def list_logs(
    campaign_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[PostingLog]:
    stmt = select(PostingLog).order_by(PostingLog.created_at.desc())
    if campaign_id is not None:
        stmt = stmt.where(PostingLog.campaign_id == campaign_id)
    if status is not None:
        stmt = stmt.where(PostingLog.status == status)
    stmt = stmt.offset(offset).limit(limit)
    return list(db.scalars(stmt))


@router.get("/replies", response_model=list[ReplyResponse])
def list_replies(
    campaign_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Reply]:
    stmt = select(Reply).order_by(Reply.created_at.desc())
    if campaign_id is not None:
        stmt = stmt.where(Reply.campaign_id == campaign_id)
    stmt = stmt.offset(offset).limit(limit)
    return list(db.scalars(stmt))
