from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    telegram_authorized: bool


class LoginStartRequest(BaseModel):
    phone_number: str = Field(min_length=6, max_length=32)


class LoginVerifyRequest(BaseModel):
    phone_number: str = Field(min_length=6, max_length=32)
    code: str = Field(min_length=2, max_length=10)
    password: str | None = None


class LoginStatusResponse(BaseModel):
    is_authorized: bool
    me_username: str | None = None
    me_phone: str | None = None


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    username: str | None = Field(default=None)
    invite_link: str | None = Field(default=None)
    telegram_id: int | None = Field(default=None)
    type: str = Field(default="group", pattern="^(group|channel)$")

    @property
    def resolved_chat_identifier(self) -> str:
        if self.username:
            u = self.username.lstrip("@")
            return f"@{u}"
        if self.invite_link:
            return self.invite_link
        if self.telegram_id is not None:
            return str(self.telegram_id)
        raise ValueError("At least one of username, invite_link, or telegram_id must be provided")


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    enabled: bool | None = None
    type: str | None = Field(default=None, pattern="^(group|channel)$")


class GroupResponse(BaseModel):
    id: int
    name: str
    username: str | None
    invite_link: str | None
    telegram_id: int | None
    chat_identifier: str
    type: str
    enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message_text: str = Field(min_length=1)
    media_path: str | None = Field(default=None)
    media_type: str = Field(default="none", pattern="^(none|image|video)$")
    parse_mode: str = Field(default="html", pattern="^(html|md)$")
    interval_minutes: int = Field(default=25, ge=1, le=1440)
    inter_group_delay_secs: int = Field(default=3, ge=0, le=300)
    forward_from_chat: str | None = Field(default=None)
    forward_from_message_id: int | None = Field(default=None)
    group_ids: list[int] = Field(default_factory=list)


class CampaignUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    message_text: str | None = Field(default=None, min_length=1)
    media_path: str | None = None
    media_type: str | None = Field(default=None, pattern="^(none|image|video)$")
    parse_mode: str | None = Field(default=None, pattern="^(html|md)$")
    interval_minutes: int | None = Field(default=None, ge=1, le=1440)
    inter_group_delay_secs: int | None = Field(default=None, ge=0, le=300)
    forward_from_chat: str | None = None
    forward_from_message_id: int | None = None
    active: bool | None = None
    group_ids: list[int] | None = None


class CampaignResponse(BaseModel):
    id: int
    title: str
    message_text: str
    media_path: str | None
    media_type: str
    parse_mode: str
    interval_minutes: int
    inter_group_delay_secs: int
    forward_from_chat: str | None
    forward_from_message_id: int | None
    active: bool
    last_run_at: datetime | None
    next_run_at: datetime | None
    created_at: datetime
    updated_at: datetime
    group_ids: list[int]


class TriggerResult(BaseModel):
    campaign_id: int
    status: str


class ScheduleCreate(BaseModel):
    schedule_type: str = Field(pattern="^(once|interval|daily|weekly|cron|queue)$")
    run_at: datetime | None = Field(default=None)
    interval_minutes: int | None = Field(default=None, ge=1, le=1440)
    cron_hour: int | None = Field(default=None, ge=0, le=23)
    cron_minute: int | None = Field(default=None, ge=0, le=59)
    cron_day_of_week: str | None = Field(default=None, pattern="^(mon|tue|wed|thu|fri|sat|sun)$")
    cron_expression: str | None = Field(default=None)
    queue_position: int = Field(default=0, ge=0)
    enabled: bool = True


class ScheduleUpdate(BaseModel):
    run_at: datetime | None = None
    interval_minutes: int | None = Field(default=None, ge=1, le=1440)
    cron_hour: int | None = Field(default=None, ge=0, le=23)
    cron_minute: int | None = Field(default=None, ge=0, le=59)
    cron_day_of_week: str | None = Field(default=None, pattern="^(mon|tue|wed|thu|fri|sat|sun)$")
    cron_expression: str | None = None
    queue_position: int | None = Field(default=None, ge=0)
    enabled: bool | None = None


class ScheduleResponse(BaseModel):
    id: int
    campaign_id: int
    schedule_type: str
    run_at: datetime | None
    interval_minutes: int | None
    cron_hour: int | None
    cron_minute: int | None
    cron_day_of_week: str | None
    cron_expression: str | None
    queue_position: int
    enabled: bool
    fired_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostingLogResponse(BaseModel):
    id: int
    campaign_id: int
    group_id: int
    status: str
    error_message: str | None
    telegram_message_id: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReplyResponse(BaseModel):
    id: int
    campaign_id: int
    group_id: int
    telegram_message_id: int
    replied_to_message_id: int
    from_user_id: int | None
    from_username: str | None
    text: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnalyticsSummary(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_groups: int
    messages_sent: int
    messages_failed: int
    total_replies: int


class CampaignStats(BaseModel):
    campaign_id: int
    campaign_title: str
    messages_sent: int
    messages_failed: int
    total_replies: int


class TopCampaign(BaseModel):
    campaign_id: int
    campaign_title: str
    messages_sent: int
    messages_failed: int
    total_replies: int
    success_rate: float


class DailyActivity(BaseModel):
    date: date
    sent: int
    failed: int
