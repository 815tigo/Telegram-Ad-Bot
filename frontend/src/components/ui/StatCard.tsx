import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Color = 'accent' | 'success' | 'danger' | 'warn';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: Color;
  sub?: string;
}

const colorMap: Record<Color, {
  icon: string; grad: string; border: string; bg: string;
}> = {
  accent:  { icon: 'text-accent',  grad: 'grad-text',         border: 'border-accent/20',  bg: 'bg-accent/8'  },
  success: { icon: 'text-success', grad: 'grad-text-success', border: 'border-success/20', bg: 'bg-success/8' },
  danger:  { icon: 'text-danger',  grad: 'grad-text-danger',  border: 'border-danger/20',  bg: 'bg-danger/8'  },
  warn:    { icon: 'text-warn',    grad: 'grad-text-warn',    border: 'border-warn/20',    bg: 'bg-warn/8'    },
};

export function StatCard({ label, value, icon: Icon, color = 'accent', sub }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={cn(
      'glass rounded-xl p-4 sm:p-6 shadow-card relative overflow-hidden',
      'border cursor-default select-none',
      'transition-transform duration-200 ease-out',
      'hover:-translate-y-0.5 hover:shadow-glow',
      c.border,
    )}>
      <div className={cn('absolute top-0 left-8 right-8 h-px opacity-60', {
        'bg-gradient-to-r from-transparent via-accent to-transparent':  color === 'accent',
        'bg-gradient-to-r from-transparent via-success to-transparent': color === 'success',
        'bg-gradient-to-r from-transparent via-danger to-transparent':  color === 'danger',
        'bg-gradient-to-r from-transparent via-warn to-transparent':    color === 'warn',
      })} />

      <div className="flex items-start gap-4">
        <div className={cn(
          'p-3 rounded-xl border flex items-center justify-center shrink-0',
          c.bg, c.border,
        )}>
          <Icon size={22} className={c.icon} />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.14em]">{label}</div>
          <div className={cn('text-2xl sm:text-3xl font-bold mono tracking-tight', c.grad)}>{value}</div>
          {sub && <div className="text-xs text-text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
