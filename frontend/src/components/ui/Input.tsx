import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, mono, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted',
          'border border-border/60 focus:border-accent/50',
          'focus:outline-none focus:ring-2 focus:ring-accent/10',
          'transition-all duration-200',
          mono && 'font-mono',
          error && 'border-danger/50 focus:border-danger/70 focus:ring-danger/10',
          className,
        )}
        style={{ background: 'var(--input-bg)' }}
        {...props}
      />
      {error && <p className="text-[11px] text-danger">{error}</p>}
      {!error && hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';
