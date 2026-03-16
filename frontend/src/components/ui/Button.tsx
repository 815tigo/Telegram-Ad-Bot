import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: [
    'text-accent border-accent/30',
    'bg-accent/8 hover:bg-accent/15 hover:border-accent/50',
    'shadow-glow-sm hover:shadow-glow',
  ].join(' '),
  outline: [
    'text-text-primary border-border',
    'hover:border-border-bright',
  ].join(' '),
  ghost: [
    'text-text-secondary border-transparent',
    'hover:text-text-primary',
  ].join(' '),
  danger: [
    'text-danger border-danger/30',
    'bg-danger/8 hover:bg-danger/15 hover:border-danger/50',
    'shadow-danger',
  ].join(' '),
  success: [
    'text-success border-success/30',
    'bg-success/8 hover:bg-success/15 hover:border-success/50',
  ].join(' '),
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3   py-2   text-xs  gap-1.5',
  md: 'px-4   py-2.5 text-sm  gap-2',
  lg: 'px-6   py-3   text-base gap-2',
};

export function Button({
  variant = 'outline', size = 'md', loading, className, disabled, children, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border',
        'transition-all duration-200 focus:outline-none',
        'disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      style={{
        ...(variant === 'outline' || variant === 'ghost' ? { background: 'var(--input-bg)' } : {}),
      }}
    >
      {loading && <Loader2 size={13} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}
