import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import campaign_scheduler
from app.db.database import get_db
from app.db.models import Campaign, CampaignGroup
from app.schemas import CampaignCreate, CampaignResponse, CampaignUpdate, TriggerResult
from app.services.campaign_service import CampaignService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _to_response(campaign: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=campaign.id,
        title=campaign.title,
        message_text=campaign.message_text,
        media_path=campaign.media_path,
        media_type=campaign.media_type,
        parse_mode=campaign.parse_mode,
        interval_minutes=campaign.interval_minutes,
        inter_group_delay_secs=campaign.inter_group_delay_secs,
        forward_from_chat=campaign.forward_from_chat,
        forward_from_message_id=campaign.forward_from_message_id,
        active=campaign.active,
        last_run_at=campaign.last_run_at,
        next_run_at=campaign.next_run_at,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        group_ids=[link.group_id for link in campaign.group_links],
    )


@router.get("", response_model=list[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)) -> list[CampaignResponse]:
    return [_to_response(c) for c in CampaignService.list_campaigns(db)]


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)) -> CampaignResponse:
    try:
        campaign = CampaignService.create_campaign(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campaign title must be unique") from exc

    campaign = db.scalar(
        select(Campaign)
        .where(Campaign.id == campaign.id)
        .options(selectinload(Campaign.group_links))
    )
    try:
        campaign_scheduler.sync_jobs_from_db()
    except Exception:
        logger.exception("Failed to sync scheduler jobs after campaign create")
    return _to_response(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)) -> CampaignResponse:
    stmt = (
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .options(selectinload(Campaign.group_links).selectinload(CampaignGroup.group))
    )
    campaign = db.scalar(stmt)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _to_response(campaign)


@router.patch("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int, payload: CampaignUpdate, db: Session = Depends(get_db)
) -> CampaignResponse:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    try:
        campaign = CampaignService.update_campaign(db, campaign, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campaign title must be unique") from exc

    campaign = db.scalar(
        select(Campaign)
        .where(Campaign.id == campaign.id)
        .options(selectinload(Campaign.group_links))
    )
    try:
        campaign_scheduler.sync_jobs_from_db()
    except Exception:
        logger.exception("Failed to sync scheduler jobs after campaign update")
    return _to_response(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)) -> None:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    try:
        campaign_scheduler.sync_jobs_from_db()
    except Exception:
        logger.exception("Failed to sync scheduler jobs after campaign delete")


@router.post("/{campaign_id}/trigger", response_model=TriggerResult)
async def trigger_campaign(campaign_id: int, db: Session = Depends(get_db)) -> TriggerResult:
    exists = db.get(Campaign, campaign_id)
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    try:
        await campaign_scheduler.trigger_now(campaign_id)
    except Exception as exc:
        logger.exception("Failed to trigger campaign %d", campaign_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return TriggerResult(campaign_id=campaign_id, status="triggered")
