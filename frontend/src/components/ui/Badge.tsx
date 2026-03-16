import { cn } from '@/lib/utils';

type Variant = 'success' | 'danger' | 'warn' | 'accent' | 'muted' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const styles: Record<Variant, string> = {
  success: 'bg-success/10 text-success  border-success/25 shadow-[0_0_8px_rgba(0,217,126,0.12)]',
  danger:  'bg-danger/10  text-danger   border-danger/25  shadow-[0_0_8px_rgba(255,69,96,0.12)]',
  warn:    'bg-warn/10    text-warn     border-warn/25',
  accent:  'bg-accent/10  text-accent   border-accent/25  shadow-[0_0_8px_rgba(0,194,255,0.12)]',
  purple:  'bg-purple/10  text-purple-bright border-purple/25',
  muted:   'text-text-secondary border-border',
};

export function Badge({ children, variant = 'muted', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border mono tracking-wide',
      styles[variant],
      className,
    )} style={variant === 'muted' ? { background: 'var(--white-alpha-4)' } : undefined}>
      {children}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'muted'}>{active ? 'ACTIVE' : 'PAUSED'}</Badge>;
}

export function LogBadge({ status }: { status: string }) {
  const v: Variant = status === 'sent' ? 'success' : status === 'failed' ? 'danger' : 'warn';
  return <Badge variant={v}>{status.toUpperCase()}</Badge>;
}
