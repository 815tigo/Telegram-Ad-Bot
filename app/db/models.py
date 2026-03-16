from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    invite_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    chat_identifier: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="group", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    campaign_links: Mapped[list["CampaignGroup"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    media_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_type: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    parse_mode: Mapped[str] = mapped_column(String(20), default="html", nullable=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    inter_group_delay_secs: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    forward_from_chat: Mapped[str | None] = mapped_column(String(255), nullable=True)
    forward_from_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    group_links: Mapped[list["CampaignGroup"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["CampaignSchedule"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    logs: Mapped[list["PostingLog"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")
    replies: Mapped[list["Reply"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")


class CampaignSchedule(Base):
    __tablename__ = "campaign_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    schedule_type: Mapped[str] = mapped_column(String(20), nullable=False)
    run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cron_hour: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cron_minute: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cron_day_of_week: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cron_expression: Mapped[str | None] = mapped_column(String(100), nullable=True)
    queue_position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="schedules")


class CampaignGroup(Base):
    __tablename__ = "campaign_groups"

    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="group_links")
    group: Mapped["Group"] = relationship(back_populates="campaign_links")


class PostingLog(Base):
    __tablename__ = "posting_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    telegram_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="logs")


class Reply(Base):
    __tablename__ = "replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    telegram_message_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    replied_to_message_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    from_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    from_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="replies")
