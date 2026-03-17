'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ToggleLeft, ToggleRight, Link2 } from 'lucide-react';
import { groups } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { PageHeader }  from '@/components/ui/PageHeader';
import { Button }      from '@/components/ui/Button';
import { Input }       from '@/components/ui/Input';
import { Badge }       from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState }  from '@/components/ui/EmptyState';
import { Users }       from 'lucide-react';
import { fmtDate }     from '@/lib/utils';

interface JoinForm   { identifier: string; name?: string }
interface ManualForm { name: string; username?: string; telegram_id?: string }

export default function GroupsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'join' | 'manual'>('join');

  const { data: groupList, isLoading } = useQuery({ queryKey: ['groups'], queryFn: groups.list });

  const joinForm   = useForm<JoinForm>();
  const manualForm = useForm<ManualForm>();

  const joinMut   = useMutation({ mutationFn: (d: JoinForm)   => groups.join(d.identifier, d.name),                                        onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); joinForm.reset(); } });
  const createMut = useMutation({
    mutationFn: (d: ManualForm) => {
      const payload: Record<string, unknown> = { name: d.name };
      const id = (d.username ?? '').trim();
      if (id.startsWith('@') || (id && !/^-?\d+$/.test(id))) {
        payload.username = id.replace(/^@/, '');
      } else if (id) {
        payload.telegram_id = Number(id);
      } else if (d.telegram_id) {
        payload.telegram_id = Number(d.telegram_id);
      }
      return groups.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); manualForm.reset(); },
  });
  const toggleMut = useMutation({ mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => groups.update(id, { enabled }),        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }) });
  const deleteMut = useMutation({ mutationFn: groups.remove,                                                                                 onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }) });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader title="Groups" description="Manage target marketplace groups" />

      {/* Add group panel */}
      <Card glow>
        <CardHeader>
          <CardTitle>Add Group</CardTitle>
          <div className="flex gap-1">
            {(['join', 'manual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${tab === t ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-secondary border-transparent hover:border-border'}`}>
                {t === 'join' ? 'Join by Link' : 'Add Manually'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {tab === 'join' ? (
            <form onSubmit={joinForm.handleSubmit(d => joinMut.mutate(d))} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <Input label="Invite Link or @username *"
                  placeholder="https://t.me/+xxxx or @groupname"
                  {...joinForm.register('identifier', { required: 'Required' })}
                  error={joinForm.formState.errors.identifier?.message} />
              </div>
              <div className="flex-1 min-w-36">
                <Input label="Custom Name (optional)" placeholder="My Group" {...joinForm.register('name')} />
              </div>
              <div className="pb-0.5">
                {joinMut.error && <p className="text-xs text-danger mb-1">{(joinMut.error as Error).message}</p>}
                <Button type="submit" variant="primary" loading={joinMut.isPending}>
                  <Link2 size={13} /> Join & Add
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={manualForm.handleSubmit(d => createMut.mutate(d))} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <Input label="Group Name *" placeholder="Marketplace Group"
                  {...manualForm.register('name', { required: 'Required' })}
                  error={manualForm.formState.errors.name?.message} />
              </div>
              <div className="flex-1 min-w-48">
                <Input label="@Username or Telegram ID *" placeholder="@groupname or -100xxxxxxxx" mono
                  {...manualForm.register('username', { required: 'Required' })}
                  error={manualForm.formState.errors.username?.message} />
              </div>
              <div className="pb-0.5">
                {createMut.error && <p className="text-xs text-danger mb-1">{(createMut.error as Error).message}</p>}
                <Button type="submit" variant="primary" loading={createMut.isPending}>
                  <Plus size={13} /> Add Group
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Registered Groups ({groupList?.length ?? 0})</CardTitle></CardHeader>
        {!groupList?.length ? (
          <EmptyState icon={Users} title="No groups yet" description="Add groups above to start targeting them" />
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Name</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Identifier</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Telegram ID</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Status</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Added</th>
                  <th className="text-right px-6 py-4 font-semibold tracking-wide uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupList.map(g => (
                  <tr key={g.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{g.name}</td>
                    <td className="px-6 py-4 mono text-text-secondary">{g.chat_identifier}</td>
                    <td className="px-6 py-4 mono text-text-muted">{g.telegram_id ?? '—'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={g.enabled ? 'success' : 'muted'}>{g.enabled ? 'ENABLED' : 'DISABLED'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{fmtDate(g.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant={g.enabled ? 'outline' : 'success'}
                          onClick={() => toggleMut.mutate({ id: g.id, enabled: !g.enabled })}>
                          {g.enabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => { if (confirm(`Delete "${g.name}"?`)) deleteMut.mutate(g.id); }}>
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
