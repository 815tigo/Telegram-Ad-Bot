from app.scheduler import CampaignScheduler
from app.services.telegram_service import TelegramService

telegram_service = TelegramService()
campaign_scheduler = CampaignScheduler(telegram_service=telegram_service)
