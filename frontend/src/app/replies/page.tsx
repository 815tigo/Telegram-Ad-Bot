'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logs, campaigns } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader }  from '@/components/ui/PageHeader';
import { Select }      from '@/components/ui/Select';
import { Badge }       from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button }      from '@/components/ui/Button';
import { EmptyState }  from '@/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';
import { fmtDate }     from '@/lib/utils';

export default function RepliesPage() {
  const [campaignFilter, setCampaignFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: campaignList } = useQuery({ queryKey: ['campaigns'], queryFn: campaigns.list });
  const { data: replyList, isLoading } = useQuery({
    queryKey: ['replies', campaignFilter, offset],
    queryFn: () => logs.replies({
      ...(campaignFilter ? { campaign_id: Number(campaignFilter) } : {}),
      limit,
      offset,
    }),
  });

  const campaignMap = Object.fromEntries((campaignList ?? []).map(c => [c.id, c.title]));

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader title="Replies" description="Incoming replies detected for your ads" />

      <div className="w-full sm:w-52">
        <Select
          options={[{ value: '', label: 'All Campaigns' }, ...(campaignList ?? []).map(c => ({ value: String(c.id), label: c.title }))]}
          value={campaignFilter}
          onChange={e => { setCampaignFilter(e.target.value); setOffset(0); }}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Reply Inbox ({replyList?.length ?? 0})</CardTitle></CardHeader>
        {isLoading ? <PageSpinner /> : !replyList?.length ? (
          <EmptyState icon={MessageSquare} title="No replies yet" description="Replies to your ads will appear here" />
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Campaign</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Sender</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Message</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Group</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {replyList.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-6 py-4 text-text-primary">{campaignMap[r.campaign_id] ?? `#${r.campaign_id}`}</td>
                    <td className="px-6 py-4">
                      {r.from_username ? (
                        <Badge variant="accent">@{r.from_username}</Badge>
                      ) : (
                        <span className="mono text-text-muted">{r.from_user_id ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-primary max-w-sm">
                      <span className="line-clamp-2">{r.text ?? <em className="text-text-muted">media</em>}</span>
                    </td>
                    <td className="px-6 py-4 mono text-text-secondary">{r.group_id}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(replyList?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-text-secondary">Offset: {offset}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={(replyList?.length ?? 0) < limit} onClick={() => setOffset(offset + limit)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
