import logging
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Campaign, CampaignGroup, CampaignSchedule, Group
from app.schemas import CampaignCreate, CampaignUpdate
from app.services.message_sender import send_campaign_to_groups
from app.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)


class CampaignService:
    @staticmethod
    def create_campaign(db: Session, payload: CampaignCreate) -> Campaign:
        groups: list[Group] = []
        if payload.group_ids:
            groups = list(db.scalars(select(Group).where(Group.id.in_(payload.group_ids), Group.enabled.is_(True))))
            if len(groups) != len(payload.group_ids):
                raise ValueError("Some group IDs are invalid or disabled")

        now = datetime.utcnow()
        campaign = Campaign(
            title=payload.title,
            message_text=payload.message_text,
            media_path=payload.media_path,
            media_type=payload.media_type,
            parse_mode=payload.parse_mode,
            interval_minutes=payload.interval_minutes,
            inter_group_delay_secs=payload.inter_group_delay_secs,
            forward_from_chat=payload.forward_from_chat,
            forward_from_message_id=payload.forward_from_message_id,
            next_run_at=now + timedelta(minutes=payload.interval_minutes),
        )
        db.add(campaign)
        db.flush()

        for group in groups:
            db.add(CampaignGroup(campaign_id=campaign.id, group_id=group.id))

        db.add(CampaignSchedule(
            campaign_id=campaign.id,
            schedule_type="interval",
            interval_minutes=payload.interval_minutes,
            enabled=True,
        ))

        db.commit()
        db.refresh(campaign)
        return campaign

    @staticmethod
    def update_campaign(db: Session, campaign: Campaign, payload: CampaignUpdate) -> Campaign:
        if payload.title is not None:
            campaign.title = payload.title
        if payload.message_text is not None:
            campaign.message_text = payload.message_text
        if payload.parse_mode is not None:
            campaign.parse_mode = payload.parse_mode
        if payload.interval_minutes is not None:
            campaign.interval_minutes = payload.interval_minutes
            campaign.next_run_at = datetime.utcnow() + timedelta(minutes=campaign.interval_minutes)
        if payload.inter_group_delay_secs is not None:
            campaign.inter_group_delay_secs = payload.inter_group_delay_secs
        if payload.media_path is not None:
            campaign.media_path = payload.media_path
        if payload.media_type is not None:
            campaign.media_type = payload.media_type
        if payload.forward_from_chat is not None:
            campaign.forward_from_chat = payload.forward_from_chat
        if payload.forward_from_message_id is not None:
            campaign.forward_from_message_id = payload.forward_from_message_id
        if payload.active is not None:
            campaign.active = payload.active

        if payload.group_ids is not None:
            groups = list(db.scalars(select(Group).where(Group.id.in_(payload.group_ids), Group.enabled.is_(True))))
            if len(groups) != len(payload.group_ids):
                raise ValueError("Some group IDs are invalid or disabled")
            db.execute(delete(CampaignGroup).where(CampaignGroup.campaign_id == campaign.id))
            for group in groups:
                db.add(CampaignGroup(campaign_id=campaign.id, group_id=group.id))

        db.commit()
        db.refresh(campaign)
        return campaign

    @staticmethod
    def list_campaigns(db: Session) -> list[Campaign]:
        stmt = select(Campaign).options(selectinload(Campaign.group_links).selectinload(CampaignGroup.group))
        return list(db.scalars(stmt).unique())

    @staticmethod
    async def run_campaign_once(db: Session, telegram: TelegramService, campaign_id: int) -> None:
        stmt = (
            select(Campaign)
            .where(Campaign.id == campaign_id)
            .options(selectinload(Campaign.group_links).selectinload(CampaignGroup.group))
        )
        campaign = db.scalar(stmt)
        if campaign is None:
            logger.warning("Campaign %d not found — skipping", campaign_id)
            return

        if not campaign.active:
            logger.info("Campaign %d is inactive — skipping", campaign_id)
            return

        active_groups = [link.group for link in campaign.group_links if link.group.enabled]
        if not active_groups:
            logger.warning("Campaign %d has no enabled target groups — skipping", campaign_id)
            return

        logger.info(
            "Campaign %d '%s' starting: %d group(s), inter-group delay=%ds",
            campaign_id, campaign.title, len(active_groups), campaign.inter_group_delay_secs,
        )

        await send_campaign_to_groups(
            telegram=telegram,
            db=db,
            campaign=campaign,
            groups=active_groups,
        )

        campaign.last_run_at = datetime.utcnow()
        campaign.next_run_at = campaign.last_run_at + timedelta(minutes=campaign.interval_minutes)
        db.commit()
