'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyActivity } from '@/types';
import { format, parseISO } from 'date-fns';

interface ActivityChartProps {
  data: DailyActivity[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--tooltip-bg)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--tooltip-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: 'var(--tooltip-shadow)',
    }}>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}:</span>
          <span style={{ color: p.color, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ActivityChart({ data }: ActivityChartProps) {
  const formatted = data.map(d => ({
    ...d,
    date: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--color-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff4560" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#ff4560" stopOpacity={0}    />
          </linearGradient>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--chart-tick)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--chart-tick)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={false} tickLine={false} allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--glass-border)', strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(v) => <span style={{ color: 'var(--chart-tick)', fontFamily: 'JetBrains Mono' }}>{v}</span>}
        />
        <Area
          type="monotone" dataKey="sent" name="Sent"
          stroke="var(--color-accent)" strokeWidth={2.5}
          fill="url(#sentGrad)"
          dot={false}
          activeDot={{ r: 5, fill: 'var(--color-accent)', strokeWidth: 0, filter: 'url(#glow-cyan)' }}
          filter="url(#glow-cyan)"
        />
        <Area
          type="monotone" dataKey="failed" name="Failed"
          stroke="#ff4560" strokeWidth={2}
          fill="url(#failGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#ff4560', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
