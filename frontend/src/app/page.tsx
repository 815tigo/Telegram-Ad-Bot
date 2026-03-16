'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone, Users, Send, XCircle, MessageSquare, Activity } from 'lucide-react';
import { analytics, logs, campaigns } from '@/lib/api';
import { StatCard }      from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { PageHeader }    from '@/components/ui/PageHeader';
import { PageSpinner }   from '@/components/ui/Spinner';
import { LogBadge }      from '@/components/ui/Badge';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { fmtRelative }   from '@/lib/utils';

export default function OverviewPage() {
  const { data: summary, isLoading: loadSummary } = useQuery({ queryKey: ['summary'],      queryFn: analytics.summary });
  const { data: daily,   isLoading: loadDaily   } = useQuery({ queryKey: ['daily'],        queryFn: () => analytics.daily(7) });
  const { data: recentLogs }                       = useQuery({ queryKey: ['recent-logs'], queryFn: () => logs.list({ limit: 8 }) });
  const { data: campaignList }                     = useQuery({ queryKey: ['campaigns'],   queryFn: campaigns.list });

  const campaignMap = Object.fromEntries((campaignList ?? []).map(c => [c.id, c.title]));

  if (loadSummary) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-slide-in">
      <PageHeader title="Overview" description="Real-time campaign performance at a glance" />

      {/* Stat row */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Campaigns"        value={summary?.total_campaigns  ?? 0} icon={Megaphone}     color="accent"  />
        <StatCard label="Active"           value={summary?.active_campaigns ?? 0} icon={Activity}      color="success" sub="running now" />
        <StatCard label="Groups"           value={summary?.total_groups     ?? 0} icon={Users}         color="accent"  />
        <StatCard label="Messages Sent"    value={summary?.messages_sent    ?? 0} icon={Send}          color="success" />
        <StatCard label="Failed"           value={summary?.messages_failed  ?? 0} icon={XCircle}       color="danger"  />
        <StatCard label="Replies"          value={summary?.total_replies    ?? 0} icon={MessageSquare} color="warn"    />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Activity</CardTitle>
          <span className="text-xs text-text-secondary mono">sent / failed</span>
        </CardHeader>
        <CardBody>
          {loadDaily ? <PageSpinner /> : <ActivityChart data={daily ?? []} />}
        </CardBody>
      </Card>

      {/* Recent posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-xs">
                <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Campaign</th>
                <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Status</th>
                <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Msg ID</th>
                <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">When</th>
              </tr>
            </thead>
            <tbody>
              {(recentLogs ?? []).map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary">{campaignMap[log.campaign_id] ?? `#${log.campaign_id}`}</td>
                  <td className="px-6 py-4"><LogBadge status={log.status} /></td>
                  <td className="px-6 py-4 mono text-sm text-text-secondary">{log.telegram_message_id ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{fmtRelative(log.created_at)}</td>
                </tr>
              ))}
              {!recentLogs?.length && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-text-muted">No posts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
