'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { logs, campaigns } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader }  from '@/components/ui/PageHeader';
import { Button }      from '@/components/ui/Button';
import { Select }      from '@/components/ui/Select';
import { LogBadge }    from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState }  from '@/components/ui/EmptyState';
import { ScrollText }  from 'lucide-react';
import { fmtDate }     from '@/lib/utils';

export default function LogsPage() {
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [offset, setOffset]                  = useState(0);
  const limit = 50;

  const { data: campaignList } = useQuery({ queryKey: ['campaigns'], queryFn: campaigns.list });
  const { data: logList, isLoading, refetch } = useQuery({
    queryKey: ['logs', campaignFilter, statusFilter, offset],
    queryFn:  () => logs.list({
      ...(campaignFilter ? { campaign_id: Number(campaignFilter) } : {}),
      ...(statusFilter   ? { status: statusFilter }               : {}),
      limit,
      offset,
    }),
  });

  const campaignMap = Object.fromEntries((campaignList ?? []).map(c => [c.id, c.title]));

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Posting Logs"
        description="Full history of every send attempt"
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw size={13} /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            options={[{ value: '', label: 'All Campaigns' }, ...(campaignList ?? []).map(c => ({ value: String(c.id), label: c.title }))]}
            value={campaignFilter}
            onChange={e => { setCampaignFilter(e.target.value); setOffset(0); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={[
              { value: '',       label: 'All Status' },
              { value: 'sent',   label: 'Sent'       },
              { value: 'failed', label: 'Failed'     },
              { value: 'skipped',label: 'Skipped'    },
            ]}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs ({logList?.length ?? 0} shown)</CardTitle>
        </CardHeader>
        {isLoading ? <PageSpinner /> : !logList?.length ? (
          <EmptyState icon={ScrollText} title="No logs found" description="Logs appear here after campaigns run" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">ID</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Campaign</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Group ID</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Status</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Msg ID</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Error</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {logList.map(l => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-6 py-4 mono text-text-muted">#{l.id}</td>
                    <td className="px-6 py-4 text-text-primary">{campaignMap[l.campaign_id] ?? `#${l.campaign_id}`}</td>
                    <td className="px-6 py-4 mono text-text-secondary">{l.group_id}</td>
                    <td className="px-6 py-4"><LogBadge status={l.status} /></td>
                    <td className="px-6 py-4 mono text-text-secondary">{l.telegram_message_id ?? '—'}</td>
                    <td className="px-6 py-4 text-danger max-w-xs truncate">{l.error_message ?? '—'}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {(logList?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-text-secondary">Offset: {offset}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={(logList?.length ?? 0) < limit} onClick={() => setOffset(offset + limit)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
