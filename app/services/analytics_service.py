from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db.models import Campaign, Group, PostingLog, Reply
from app.schemas import AnalyticsSummary, CampaignStats, DailyActivity, TopCampaign


class AnalyticsService:
    @staticmethod
    def get_summary(db: Session) -> AnalyticsSummary:
        total_campaigns = db.scalar(select(func.count()).select_from(Campaign)) or 0
        active_campaigns = db.scalar(select(func.count()).select_from(Campaign).where(Campaign.active.is_(True))) or 0
        total_groups = db.scalar(select(func.count()).select_from(Group)) or 0
        messages_sent = (
            db.scalar(select(func.count()).select_from(PostingLog).where(PostingLog.status == "success")) or 0
        )
        messages_failed = (
            db.scalar(select(func.count()).select_from(PostingLog).where(PostingLog.status == "failed")) or 0
        )
        total_replies = db.scalar(select(func.count()).select_from(Reply)) or 0

        return AnalyticsSummary(
            total_campaigns=total_campaigns,
            active_campaigns=active_campaigns,
            total_groups=total_groups,
            messages_sent=messages_sent,
            messages_failed=messages_failed,
            total_replies=total_replies,
        )

    @staticmethod
    def get_campaign_stats(db: Session, campaign_id: int) -> CampaignStats | None:
        campaign = db.get(Campaign, campaign_id)
        if campaign is None:
            return None

        messages_sent = (
            db.scalar(
                select(func.count())
                .select_from(PostingLog)
                .where(PostingLog.campaign_id == campaign_id, PostingLog.status == "success")
            )
            or 0
        )
        messages_failed = (
            db.scalar(
                select(func.count())
                .select_from(PostingLog)
                .where(PostingLog.campaign_id == campaign_id, PostingLog.status == "failed")
            )
            or 0
        )
        total_replies = (
            db.scalar(select(func.count()).select_from(Reply).where(Reply.campaign_id == campaign_id)) or 0
        )

        total = messages_sent + messages_failed
        return CampaignStats(
            campaign_id=campaign_id,
            campaign_title=campaign.title,
            messages_sent=messages_sent,
            messages_failed=messages_failed,
            total_replies=total_replies,
            success_rate=round(messages_sent / total * 100, 1) if total > 0 else 0.0,
        )

    @staticmethod
    def get_top_campaigns(db: Session, limit: int = 10) -> list[TopCampaign]:
        rows = db.execute(
            select(
                Campaign.id.label("campaign_id"),
                Campaign.title.label("campaign_title"),
                func.sum(case((PostingLog.status == "success", 1), else_=0)).label("sent"),
                func.sum(case((PostingLog.status == "failed", 1), else_=0)).label("failed"),
            )
            .outerjoin(PostingLog, PostingLog.campaign_id == Campaign.id)
            .group_by(Campaign.id, Campaign.title)
            .order_by(func.sum(case((PostingLog.status == "success", 1), else_=0)).desc())
            .limit(limit)
        ).fetchall()

        result: list[TopCampaign] = []
        for row in rows:
            sent = row.sent or 0
            failed = row.failed or 0
            total = sent + failed
            reply_count = (
                db.scalar(
                    select(func.count()).select_from(Reply).where(Reply.campaign_id == row.campaign_id)
                )
                or 0
            )
            result.append(
                TopCampaign(
                    campaign_id=row.campaign_id,
                    campaign_title=row.campaign_title,
                    messages_sent=sent,
                    messages_failed=failed,
                    total_replies=reply_count,
                    success_rate=round(sent / total * 100, 1) if total > 0 else 0.0,
                )
            )
        return result

    @staticmethod
    def get_daily_activity(db: Session, days: int = 30) -> list[DailyActivity]:
        since = datetime.utcnow() - timedelta(days=days)
        rows = db.execute(
            select(
                func.date(PostingLog.created_at).label("day"),
                PostingLog.status,
                func.count().label("cnt"),
            )
            .where(PostingLog.created_at >= since)
            .group_by(func.date(PostingLog.created_at), PostingLog.status)
            .order_by(func.date(PostingLog.created_at))
        ).fetchall()

        buckets: dict[str, dict[str, int]] = {}
        for row in rows:
            day_str = str(row.day)
            if day_str not in buckets:
                buckets[day_str] = {"sent": 0, "failed": 0}
            if row.status == "success":
                buckets[day_str]["sent"] += row.cnt
            elif row.status == "failed":
                buckets[day_str]["failed"] += row.cnt

        return [DailyActivity(date=day, sent=v["sent"], failed=v["failed"]) for day, v in sorted(buckets.items())]

    @staticmethod
    def get_recent_replies(db: Session, limit: int = 50) -> list[Reply]:
        stmt = select(Reply).order_by(Reply.created_at.desc()).limit(limit)
        return list(db.scalars(stmt))
