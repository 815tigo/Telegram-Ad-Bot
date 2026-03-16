import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div className={cn(
      'glass rounded-xl relative overflow-hidden glow-border-top shadow-card',
      'transition-all duration-300',
      'hover:border-accent/15',
      glow && 'shadow-glow',
      className,
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-5',
      className,
    )} style={{ borderBottom: '1px solid var(--white-alpha-4)' }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn(
      'text-sm font-semibold tracking-[0.1em] uppercase',
      'text-text-secondary',
      className,
    )}>
      {children}
    </h2>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}
