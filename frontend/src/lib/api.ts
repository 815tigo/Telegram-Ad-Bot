import type {
  AuthStatus,
  Campaign,
  CampaignCreate,
  CampaignStats,
  DailyActivity,
  Group,
  AnalyticsSummary,
  PostingLog,
  Reply,
  Schedule,
} from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const KEY  = process.env.NEXT_PUBLIC_API_KEY  ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(KEY ? { 'X-API-Key': KEY } : {}),
    ...((init?.headers ?? {}) as Record<string, string>),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const auth = {
  status:   ()                                    => req<AuthStatus>('/auth/status'),
  start:    (phone: string)                       => req<{ message: string }>('/auth/start',  { method: 'POST', body: JSON.stringify({ phone_number: phone }) }),
  verify:   (phone: string, code: string, password?: string) =>
    req<{ message: string }>('/auth/verify', { method: 'POST', body: JSON.stringify({ phone_number: phone, code, password }) }),
  logout:   ()                                    => req<{ message: string }>('/auth/logout', { method: 'POST' }),
};

// ─── Groups ───────────────────────────────────────────────────────────────
export const groups = {
  list:   ()                             => req<Group[]>('/groups'),
  join:   (identifier: string, name?: string) =>
    req<Group>('/groups/join', { method: 'POST', body: JSON.stringify({ identifier, name }) }),
  create: (payload: Partial<Group>)      => req<Group>('/groups',     { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: Partial<Group>) =>
    req<Group>(`/groups/${id}`,  { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: number)                   => req<void>(`/groups/${id}`, { method: 'DELETE' }),
};

// ─── Campaigns ────────────────────────────────────────────────────────────
export const campaigns = {
  list:    ()                                => req<Campaign[]>('/campaigns'),
  get:     (id: number)                      => req<Campaign>(`/campaigns/${id}`),
  create:  (payload: CampaignCreate)         => req<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(payload) }),
  update:  (id: number, payload: Partial<Campaign>) =>
    req<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove:  (id: number)                      => req<void>(`/campaigns/${id}`, { method: 'DELETE' }),
  trigger: (id: number)                      => req<{ campaign_id: number; status: string }>(`/campaigns/${id}/trigger`, { method: 'POST' }),
};

// ─── Schedules ────────────────────────────────────────────────────────────
export const schedules = {
  list:   (campaignId: number)                                => req<Schedule[]>(`/campaigns/${campaignId}/schedules`),
  create: (campaignId: number, payload: Partial<Schedule>)   =>
    req<Schedule>(`/campaigns/${campaignId}/schedules`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (campaignId: number, id: number, payload: Partial<Schedule>) =>
    req<Schedule>(`/campaigns/${campaignId}/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (campaignId: number, id: number)                   =>
    req<void>(`/campaigns/${campaignId}/schedules/${id}`, { method: 'DELETE' }),
};

// ─── Logs ─────────────────────────────────────────────────────────────────
function toSearchParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const logs = {
  list: (params?: { campaign_id?: number; status?: string; limit?: number; offset?: number }) =>
    req<PostingLog[]>(`/logs?${toSearchParams(params)}`),
  replies: (params?: { campaign_id?: number; limit?: number; offset?: number }) =>
    req<Reply[]>(`/logs/replies?${toSearchParams(params)}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────
export const analytics = {
  summary:       ()                  => req<AnalyticsSummary>('/analytics/summary'),
  daily:         (days = 7)          => req<DailyActivity[]>(`/analytics/daily?days=${days}`),
  topCampaigns:  (limit = 5)         => req<CampaignStats[]>(`/analytics/top-campaigns?limit=${limit}`),
  campaign:      (id: number)        => req<CampaignStats>(`/analytics/campaign/${id}`),
};
