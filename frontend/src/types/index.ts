export interface Group {
  id: number;
  name: string;
  username: string | null;
  invite_link: string | null;
  telegram_id: number | null;
  chat_identifier: string;
  type: string;
  enabled: boolean;
  created_at: string;
}

export interface Campaign {
  id: number;
  title: string;
  message_text: string;
  media_path: string | null;
  media_type: string;
  parse_mode: string;
  interval_minutes: number;
  inter_group_delay_secs: number;
  forward_from_chat: string | null;
  forward_from_message_id: number | null;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  group_ids: number[];
}

export interface CampaignCreate {
  title: string;
  message_text?: string;
  media_path?: string;
  media_type?: string;
  parse_mode?: string;
  interval_minutes?: number;
  inter_group_delay_secs?: number;
  forward_from_chat?: string;
  forward_from_message_id?: number;
  group_ids?: number[];
}

export interface Schedule {
  id: number;
  campaign_id: number;
  schedule_type: string;
  run_at: string | null;
  interval_minutes: number | null;
  cron_hour: number | null;
  cron_minute: number | null;
  cron_day_of_week: string | null;
  cron_expression: string | null;
  queue_position: number;
  enabled: boolean;
  fired_at: string | null;
  created_at: string;
}

export interface PostingLog {
  id: number;
  campaign_id: number;
  group_id: number;
  status: string;
  error_message: string | null;
  telegram_message_id: number | null;
  created_at: string;
}

export interface Reply {
  id: number;
  campaign_id: number;
  group_id: number;
  telegram_message_id: number;
  replied_to_message_id: number;
  from_user_id: number | null;
  from_username: string | null;
  text: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_campaigns: number;
  active_campaigns: number;
  total_groups: number;
  messages_sent: number;
  messages_failed: number;
  total_replies: number;
}

export interface DailyActivity {
  date: string;
  sent: number;
  failed: number;
}

export interface CampaignStats {
  campaign_id: number;
  campaign_title: string;
  messages_sent: number;
  messages_failed: number;
  total_replies: number;
  success_rate: number;
}

export interface AuthStatus {
  is_authorized: boolean;
  me_phone: string | null;
  me_username: string | null;
}
