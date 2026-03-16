from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import telegram_service
from app.db.database import get_db
from app.db.models import Group
from app.schemas import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["groups"])


class JoinGroupRequest(BaseModel):
    identifier: str = Field(min_length=1, description="Invite link (https://t.me/+xxx) or @username")
    name: str | None = Field(default=None, max_length=255)


@router.post("/join", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def join_and_add_group(payload: JoinGroupRequest, db: Session = Depends(get_db)) -> Group:
    try:
        result = await telegram_service.join_group(payload.identifier)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    is_invite = "/+" in payload.identifier or "/joinchat/" in payload.identifier
    group = Group(
        name=payload.name or result["title"],
        username=result["username"],
        invite_link=payload.identifier if is_invite else None,
        telegram_id=result["chat_id"],
        chat_identifier=payload.identifier if is_invite else f"@{result['username']}" if result["username"] else str(result["chat_id"]),
        type="group",
    )
    db.add(group)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This group is already registered") from exc
    db.refresh(group)
    return group


@router.get("", response_model=list[GroupResponse])
def list_groups(enabled: bool | None = None, db: Session = Depends(get_db)) -> list[Group]:
    stmt = select(Group).order_by(Group.created_at.desc())
    if enabled is not None:
        stmt = stmt.where(Group.enabled.is_(enabled))
    return list(db.scalars(stmt))


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, db: Session = Depends(get_db)) -> Group:
    try:
        chat_identifier = payload.resolved_chat_identifier
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    group = Group(
        name=payload.name,
        username=payload.username.lstrip("@") if payload.username else None,
        invite_link=payload.invite_link,
        telegram_id=payload.telegram_id,
        chat_identifier=chat_identifier,
        type=payload.type,
    )
    db.add(group)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A group with this username, invite link, or Telegram ID already exists",
        ) from exc
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


@router.patch("/{group_id}", response_model=GroupResponse)
def update_group(group_id: int, payload: GroupUpdate, db: Session = Depends(get_db)) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if payload.name is not None:
        group.name = payload.name
    if payload.enabled is not None:
        group.enabled = payload.enabled
    if payload.type is not None:
        group.type = payload.type

    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(get_db)) -> None:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    db.delete(group)
    db.commit()
