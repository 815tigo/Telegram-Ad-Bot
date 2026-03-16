from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import campaign_scheduler
from app.db.database import get_db
from app.db.models import Campaign, CampaignSchedule
from app.schemas import ScheduleCreate, ScheduleResponse, ScheduleUpdate

router = APIRouter(prefix="/campaigns/{campaign_id}/schedules", tags=["schedules"])


def _get_campaign_or_404(campaign_id: int, db: Session) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.get("", response_model=list[ScheduleResponse])
def list_schedules(campaign_id: int, db: Session = Depends(get_db)) -> list[CampaignSchedule]:
    _get_campaign_or_404(campaign_id, db)
    stmt = (
        select(CampaignSchedule)
        .where(CampaignSchedule.campaign_id == campaign_id)
        .order_by(CampaignSchedule.queue_position, CampaignSchedule.created_at)
    )
    return list(db.scalars(stmt))


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    campaign_id: int,
    payload: ScheduleCreate,
    db: Session = Depends(get_db),
) -> CampaignSchedule:
    _get_campaign_or_404(campaign_id, db)

    schedule = CampaignSchedule(
        campaign_id=campaign_id,
        schedule_type=payload.schedule_type,
        run_at=payload.run_at,
        interval_minutes=payload.interval_minutes,
        cron_hour=payload.cron_hour,
        cron_minute=payload.cron_minute,
        cron_day_of_week=payload.cron_day_of_week,
        cron_expression=payload.cron_expression,
        queue_position=payload.queue_position,
        enabled=payload.enabled,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    campaign_scheduler.sync_jobs_from_db()
    return schedule


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(campaign_id: int, schedule_id: int, db: Session = Depends(get_db)) -> CampaignSchedule:
    schedule = db.scalar(
        select(CampaignSchedule).where(
            CampaignSchedule.id == schedule_id,
            CampaignSchedule.campaign_id == campaign_id,
        )
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    campaign_id: int,
    schedule_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
) -> CampaignSchedule:
    schedule = db.scalar(
        select(CampaignSchedule).where(
            CampaignSchedule.id == schedule_id,
            CampaignSchedule.campaign_id == campaign_id,
        )
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if payload.run_at is not None:
        schedule.run_at = payload.run_at
    if payload.interval_minutes is not None:
        schedule.interval_minutes = payload.interval_minutes
    if payload.cron_hour is not None:
        schedule.cron_hour = payload.cron_hour
    if payload.cron_minute is not None:
        schedule.cron_minute = payload.cron_minute
    if payload.cron_day_of_week is not None:
        schedule.cron_day_of_week = payload.cron_day_of_week
    if payload.cron_expression is not None:
        schedule.cron_expression = payload.cron_expression
    if payload.queue_position is not None:
        schedule.queue_position = payload.queue_position
    if payload.enabled is not None:
        schedule.enabled = payload.enabled

    db.commit()
    db.refresh(schedule)

    campaign_scheduler.sync_jobs_from_db()
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(campaign_id: int, schedule_id: int, db: Session = Depends(get_db)) -> None:
    schedule = db.scalar(
        select(CampaignSchedule).where(
            CampaignSchedule.id == schedule_id,
            CampaignSchedule.campaign_id == campaign_id,
        )
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    campaign_scheduler.sync_jobs_from_db()
