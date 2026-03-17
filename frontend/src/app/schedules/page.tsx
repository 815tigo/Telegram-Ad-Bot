'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { schedules, campaigns } from '@/lib/api';
import { useForm, useWatch } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { PageHeader }  from '@/components/ui/PageHeader';
import { Button }      from '@/components/ui/Button';
import { Input }       from '@/components/ui/Input';
import { Select }      from '@/components/ui/Select';
import { Badge }       from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState }  from '@/components/ui/EmptyState';
import { CalendarClock } from 'lucide-react';
import { fmtDate, fmtRelative } from '@/lib/utils';
import type { Schedule } from '@/types';

const DAYS = [
  { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' }, { value: 'sat', label: 'Sat' }, { value: 'sun', label: 'Sun' },
];

interface ScheduleForm {
  campaign_id: string;
  schedule_type: string;
  interval_minutes?: number;
  cron_hour?: number;
  cron_minute?: number;
  cron_day_of_week?: string;
  run_at?: string;
  cron_expression?: string;
}

export default function SchedulesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: campaignList, isLoading: loadCampaigns } = useQuery({ queryKey: ['campaigns'], queryFn: campaigns.list });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ScheduleForm>({
    defaultValues: { schedule_type: 'interval' },
  });
  const scheduleType = useWatch({ control, name: 'schedule_type' });
  const campaignId   = useWatch({ control, name: 'campaign_id' });

  const { data: scheduleList, isLoading: loadSchedules } = useQuery({
    queryKey: ['schedules', campaignId],
    queryFn:  () => schedules.list(Number(campaignId)),
    enabled:  !!campaignId,
  });

  const { data: allSchedules, isLoading: loadAll } = useQuery({
    queryKey: ['all-schedules'],
    queryFn:  async () => {
      const all = await Promise.all((campaignList ?? []).map(c => schedules.list(c.id)));
      return all.flat();
    },
    enabled: !!campaignList?.length,
  });

  const createMut = useMutation({
    mutationFn: (d: ScheduleForm) => schedules.create(Number(d.campaign_id), {
      schedule_type:     d.schedule_type,
      interval_minutes:  d.schedule_type === 'interval' ? Number(d.interval_minutes) : undefined,
      cron_hour:         ['daily','weekly'].includes(d.schedule_type) ? Number(d.cron_hour) : undefined,
      cron_minute:       ['daily','weekly'].includes(d.schedule_type) ? Number(d.cron_minute) : undefined,
      cron_day_of_week:  d.schedule_type === 'weekly' ? d.cron_day_of_week : undefined,
      run_at:            ['once','queue'].includes(d.schedule_type) ? d.run_at : undefined,
      cron_expression:   d.schedule_type === 'cron' ? d.cron_expression : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-schedules'] }); reset(); setShowForm(false); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ cId, sId, enabled }: { cId: number; sId: number; enabled: boolean }) =>
      schedules.update(cId, sId, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-schedules'] }),
  });

  const deleteMut = useMutation({
    mutationFn: ({ cId, sId }: { cId: number; sId: number }) => schedules.remove(cId, sId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-schedules'] }),
  });

  const campaignMap = Object.fromEntries((campaignList ?? []).map(c => [c.id, c.title]));

  if (loadCampaigns || loadAll) return <PageSpinner />;

  return (
    <div className="space-y-5 animate-slide-in">
      <PageHeader
        title="Schedules"
        description="Control when campaigns run"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : <><Plus size={14} /> Add Schedule</>}
          </Button>
        }
      />

      {showForm && (
        <Card glow>
          <CardHeader><CardTitle>New Schedule Rule</CardTitle></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select
                label="Campaign *"
                options={[{ value: '', label: '— Select —' }, ...(campaignList ?? []).map(c => ({ value: String(c.id), label: c.title }))]}
                {...register('campaign_id', { required: 'Required' })}
                error={errors.campaign_id?.message}
              />
              <Select
                label="Schedule Type"
                options={[
                  { value: 'interval', label: 'Interval (repeat)' },
                  { value: 'daily',    label: 'Daily (fixed time)' },
                  { value: 'weekly',   label: 'Weekly' },
                  { value: 'once',     label: 'One-time' },
                  { value: 'queue',    label: 'Queue' },
                  { value: 'cron',     label: 'Cron expression' },
                ]}
                {...register('schedule_type')}
              />

              {scheduleType === 'interval' && (
                <Input label="Interval (minutes)" type="number" defaultValue={25} {...register('interval_minutes')} />
              )}
              {(scheduleType === 'daily' || scheduleType === 'weekly') && (
                <>
                  <Input label="Hour (0-23)"   type="number" min={0}  max={23} {...register('cron_hour')}   />
                  <Input label="Minute (0-59)" type="number" min={0}  max={59} {...register('cron_minute')} />
                </>
              )}
              {scheduleType === 'weekly' && (
                <Select label="Day of Week" options={DAYS} {...register('cron_day_of_week')} />
              )}
              {(scheduleType === 'once' || scheduleType === 'queue') && (
                <Input label="Run At (local datetime)" type="datetime-local" {...register('run_at')} />
              )}
              {scheduleType === 'cron' && (
                <Input label="Cron Expression" placeholder="0 21 * * *" mono {...register('cron_expression')} />
              )}

              <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2">
                {createMut.error && <span className="text-xs text-danger mr-auto">{(createMut.error as Error).message}</span>}
                <Button type="submit" variant="primary" loading={createMut.isPending}>Add Schedule</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Active Schedules ({allSchedules?.length ?? 0})</CardTitle></CardHeader>
        {!allSchedules?.length ? (
          <EmptyState icon={CalendarClock} title="No schedules yet" description="Create a schedule to automate campaign posting" />
        ) : (
          <div className="overflow-x-auto table-responsive">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Campaign</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Type</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Detail</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Status</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide uppercase">Last Fired</th>
                  <th className="text-right px-6 py-4 font-semibold tracking-wide uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSchedules.map((s: Schedule) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-6 py-4 text-text-primary">{campaignMap[s.campaign_id] ?? `#${s.campaign_id}`}</td>
                    <td className="px-6 py-4"><Badge variant="accent">{s.schedule_type.toUpperCase()}</Badge></td>
                    <td className="px-6 py-4 mono text-text-secondary">
                      {s.schedule_type === 'interval' && `Every ${s.interval_minutes}m`}
                      {s.schedule_type === 'daily'    && `Daily ${String(s.cron_hour ?? 0).padStart(2,'0')}:${String(s.cron_minute ?? 0).padStart(2,'0')}`}
                      {s.schedule_type === 'weekly'   && `${(s.cron_day_of_week ?? '').toUpperCase()} ${String(s.cron_hour ?? 0).padStart(2,'0')}:${String(s.cron_minute ?? 0).padStart(2,'0')}`}
                      {(s.schedule_type === 'once' || s.schedule_type === 'queue') && fmtDate(s.run_at)}
                      {s.schedule_type === 'cron'     && s.cron_expression}
                    </td>
                    <td className="px-6 py-4"><Badge variant={s.enabled ? 'success' : 'muted'}>{s.enabled ? 'ON' : 'OFF'}</Badge></td>
                    <td className="px-6 py-4 text-text-secondary">{fmtRelative(s.fired_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant={s.enabled ? 'outline' : 'success'}
                          onClick={() => toggleMut.mutate({ cId: s.campaign_id, sId: s.id, enabled: !s.enabled })}>
                          {s.enabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => { if (confirm('Delete this schedule?')) deleteMut.mutate({ cId: s.campaign_id, sId: s.id }); }}>
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
