from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import AnalyticsSummary, CampaignStats, DailyActivity, TopCampaign
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def summary(db: Session = Depends(get_db)) -> AnalyticsSummary:
    return AnalyticsService.get_summary(db)


@router.get("/top-campaigns", response_model=list[TopCampaign])
def top_campaigns(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[TopCampaign]:
    return AnalyticsService.get_top_campaigns(db, limit)


@router.get("/campaign/{campaign_id}", response_model=CampaignStats)
def campaign_stats(campaign_id: int, db: Session = Depends(get_db)) -> CampaignStats:
    stats = AnalyticsService.get_campaign_stats(db, campaign_id)
    if stats is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return stats


@router.get("/daily", response_model=list[DailyActivity])
def daily_activity(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> list[DailyActivity]:
    return AnalyticsService.get_daily_activity(db, days)
