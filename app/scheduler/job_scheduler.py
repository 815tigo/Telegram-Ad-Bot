import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.db.models import Campaign, CampaignSchedule
from app.services.campaign_service import CampaignService
from app.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)

_SCHEDULE_TYPES = {"once", "interval", "daily", "weekly", "cron", "queue"}


def _build_trigger(schedule: CampaignSchedule, timezone: str = "UTC"):
    st = schedule.schedule_type

    if st in ("once", "queue"):
        if schedule.run_at is None:
            raise ValueError(f"schedule {schedule.id}: run_at is required for type '{st}'")
        return DateTrigger(run_date=schedule.run_at, timezone=timezone)

    if st == "interval":
        minutes = schedule.interval_minutes
        if not minutes or minutes < 1:
            raise ValueError(f"schedule {schedule.id}: interval_minutes must be >= 1")
        return IntervalTrigger(minutes=minutes)

    if st == "daily":
        hour = schedule.cron_hour if schedule.cron_hour is not None else 0
        minute = schedule.cron_minute if schedule.cron_minute is not None else 0
        return CronTrigger(hour=hour, minute=minute, timezone=timezone)

    if st == "weekly":
        dow = schedule.cron_day_of_week
        if not dow:
            raise ValueError(f"schedule {schedule.id}: cron_day_of_week required for type 'weekly'")
        hour = schedule.cron_hour if schedule.cron_hour is not None else 0
        minute = schedule.cron_minute if schedule.cron_minute is not None else 0
        return CronTrigger(day_of_week=dow, hour=hour, minute=minute, timezone=timezone)

    if st == "cron":
        expr = schedule.cron_expression
        if not expr:
            raise ValueError(f"schedule {schedule.id}: cron_expression required for type 'cron'")
        parts = expr.strip().split()
        if len(parts) != 5:
            raise ValueError(f"schedule {schedule.id}: cron_expression must have 5 fields, got: '{expr}'")
        minute, hour, dom, month, dow = parts
        return CronTrigger(minute=minute, hour=hour, day=dom, month=month, day_of_week=dow, timezone=timezone)

    raise ValueError(f"schedule {schedule.id}: unknown schedule_type '{st}'")


class CampaignScheduler:
    def __init__(self, telegram_service: TelegramService) -> None:
        settings = get_settings()
        self.telegram_service = telegram_service
        self._timezone = settings.scheduler_timezone
        self.scheduler = AsyncIOScheduler(timezone=self._timezone)

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
        self.sync_jobs_from_db()
        logger.info("CampaignScheduler started")

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
        logger.info("CampaignScheduler stopped")

    def sync_jobs_from_db(self) -> None:
        db = SessionLocal()
        try:
            active_campaign_ids = set(
                db.scalars(select(Campaign.id).where(Campaign.active.is_(True)))
            )
            schedules = list(
                db.scalars(
                    select(CampaignSchedule).where(
                        CampaignSchedule.enabled.is_(True),
                        CampaignSchedule.campaign_id.in_(active_campaign_ids),
                    )
                )
            )
        finally:
            db.close()

        existing_job_ids = {job.id for job in self.scheduler.get_jobs()}
        desired_job_ids: set[str] = set()

        for schedule in schedules:
            job_id = self._job_id(schedule.id)
            desired_job_ids.add(job_id)
            try:
                trigger = _build_trigger(schedule, timezone=self._timezone)
            except ValueError as exc:
                logger.error("Skipping schedule %d: %s", schedule.id, exc)
                continue

            self.scheduler.add_job(
                self._run_schedule_job,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
                kwargs={"schedule_id": schedule.id, "campaign_id": schedule.campaign_id},
                max_instances=1,
                coalesce=True,
            )
            logger.debug(
                "Registered job %s (campaign=%d type=%s)",
                job_id, schedule.campaign_id, schedule.schedule_type,
            )

        for stale_id in existing_job_ids - desired_job_ids:
            try:
                self.scheduler.remove_job(stale_id)
                logger.debug("Removed stale job %s", stale_id)
            except Exception:  # noqa: BLE001
                pass

    async def trigger_now(self, campaign_id: int) -> None:
        db = SessionLocal()
        try:
            await CampaignService.run_campaign_once(
                db=db, telegram=self.telegram_service, campaign_id=campaign_id
            )
        finally:
            db.close()

    async def _run_schedule_job(self, schedule_id: int, campaign_id: int) -> None:
        db = SessionLocal()
        try:
            schedule = db.get(CampaignSchedule, schedule_id)
            if schedule is None:
                logger.warning("Schedule %d no longer exists, skipping", schedule_id)
                return
            if not schedule.enabled:
                logger.info("Schedule %d is disabled, skipping", schedule_id)
                return

            logger.info(
                "Schedule %d fired (campaign=%d type=%s)",
                schedule_id, campaign_id, schedule.schedule_type,
            )

            await CampaignService.run_campaign_once(
                db=db, telegram=self.telegram_service, campaign_id=campaign_id
            )

            schedule.fired_at = datetime.utcnow()

            if schedule.schedule_type in ("once", "queue"):
                schedule.enabled = False
                logger.info(
                    "Schedule %d (type=%s) auto-disabled after firing",
                    schedule_id, schedule.schedule_type,
                )

            db.commit()

        except Exception:  # noqa: BLE001
            logger.exception("Unhandled error in schedule job %d", schedule_id)
        finally:
            db.close()

    @staticmethod
    def _job_id(schedule_id: int) -> str:
        return f"schedule:{schedule_id}"
