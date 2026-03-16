import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235f6b80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E")`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'rounded-lg px-4 py-3 text-sm text-text-primary',
          'border border-border/60 focus:border-accent/50',
          'focus:outline-none focus:ring-2 focus:ring-accent/10',
          'transition-all duration-200',
          'bg-surface hover:bg-surface2',
          'appearance-none cursor-pointer',
          error && 'border-danger/50',
          className,
        )}
        style={{
          backgroundImage: chevron,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '2.5rem',
        }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
