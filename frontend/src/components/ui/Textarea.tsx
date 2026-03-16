import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-text-secondary font-medium">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'bg-surface2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-colors resize-none',
          error && 'border-danger/50',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
