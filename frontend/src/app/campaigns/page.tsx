'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Trash2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { campaigns, groups } from '@/lib/api';
import type { CampaignCreate } from '@/types';
import { useForm }       from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { PageHeader }    from '@/components/ui/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Input }         from '@/components/ui/Input';
import { Textarea }      from '@/components/ui/Textarea';
import { Select }        from '@/components/ui/Select';
import { StatusBadge }   from '@/components/ui/Badge';
import { PageSpinner }   from '@/components/ui/Spinner';
import { EmptyState }    from '@/components/ui/EmptyState';
import { fmtRelative, fmtDuration } from '@/lib/utils';
import { Megaphone }     from 'lucide-react';

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: campaignList, isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: campaigns.list });
  const { data: groupList }               = useQuery({ queryKey: ['groups'],    queryFn: groups.list });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignCreate>();
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());

  const createMut  = useMutation({ mutationFn: campaigns.create,                      onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); reset(); setSelectedGroupIds(new Set()); setShowForm(false); } });
  const toggleMut  = useMutation({ mutationFn: ({ id, active }: { id: number; active: boolean }) => campaigns.update(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const triggerMut = useMutation({ mutationFn: campaigns.trigger,                     onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const deleteMut  = useMutation({ mutationFn: campaigns.remove,                      onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });

  const onSubmit = handleSubmit((data) => {
    const payload: CampaignCreate = {
      title:               data.title,
      message_text:        data.message_text || '',
      interval_minutes:    Number(data.interval_minutes) || 25,
      inter_group_delay_secs: Number(data.inter_group_delay_secs) || 5,
      forward_from_chat:   data.forward_from_chat || undefined,
      forward_from_message_id: data.forward_from_message_id ? Number(data.forward_from_message_id) : undefined,
      group_ids:           [...selectedGroupIds],
    };
    createMut.mutate(payload);
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Campaigns"
        description="Manage advertisement campaigns"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'New Campaign'}
          </Button>
        }
      />

      {/* Create form */}
      {showForm && (
        <Card glow>
          <CardHeader><CardTitle>Create Campaign</CardTitle></CardHeader>
          <CardBody>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Campaign Title *" {...register('title', { required: 'Required' })} error={errors.title?.message} placeholder="e.g. Daily Instagram Promo" />
              <Input label="Interval (minutes)" type="number" defaultValue={25} {...register('interval_minutes')} />
              <div className="md:col-span-2">
                <Textarea label="Ad Message Text" rows={4} placeholder="Your advertisement text…" {...register('message_text')} />
              </div>
              <Input label="Forward From Chat" placeholder="@username or chat_id" {...register('forward_from_chat')} />
              <Input label="Forward Message ID" type="number" placeholder="Message ID to forward" mono {...register('forward_from_message_id')} />
              <Input label="Inter-Group Delay (secs)" type="number" defaultValue={5} {...register('inter_group_delay_secs')} />

              {/* Group multi-select */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Target Groups</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-4 border border-border/60 rounded-lg">
                  {(groupList ?? []).filter(g => g.enabled).map(g => (
                    <label key={g.id} className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
                      <input type="checkbox" className="accent-accent w-4 h-4"
                        checked={selectedGroupIds.has(g.id)}
                        onChange={(e) => {
                          setSelectedGroupIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(g.id);
                            else next.delete(g.id);
                            return next;
                          });
                        }}
                      />
                      {g.name}
                    </label>
                  ))}
                  {!(groupList ?? []).filter(g => g.enabled).length && (
                    <span className="text-text-muted text-sm">No enabled groups yet. Add groups first.</span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                {createMut.error && <span className="text-xs text-danger mr-auto">{(createMut.error as Error).message}</span>}
                <Button type="submit" variant="primary" loading={createMut.isPending}>Create Campaign</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>All Campaigns ({campaignList?.length ?? 0})</CardTitle></CardHeader>
        {!campaignList?.length ? (
          <EmptyState icon={Megaphone} title="No campaigns yet" description="Create your first campaign to start sending ads" />
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Title</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Status</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Interval</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Groups</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Last Run</th>
                  <th className="text-right px-6 py-4 font-semibold tracking-wide uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaignList.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{c.title}</td>
                    <td className="px-6 py-4"><StatusBadge active={c.active} /></td>
                    <td className="px-6 py-4 mono text-text-secondary">{fmtDuration(c.interval_minutes)}</td>
                    <td className="px-6 py-4 mono text-text-secondary">{c.group_ids.length}</td>
                    <td className="px-6 py-4 text-text-secondary">{fmtRelative(c.last_run_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="primary" title="Trigger now"
                          loading={triggerMut.isPending && triggerMut.variables === c.id}
                          onClick={() => triggerMut.mutate(c.id)}>
                          <Zap size={12} />
                        </Button>
                        <Button size="sm" variant={c.active ? 'outline' : 'success'}
                          onClick={() => toggleMut.mutate({ id: c.id, active: !c.active })}>
                          {c.active ? <Pause size={12} /> : <Play size={12} />}
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => { if (confirm(`Delete "${c.title}"?`)) deleteMut.mutate(c.id); }}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
