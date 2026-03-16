import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-lg bg-surface2 border border-border flex items-center justify-center">
        <Icon size={22} className="text-text-muted" />
      </div>
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {description && <div className="text-xs text-text-muted max-w-xs">{description}</div>}
    </div>
  );
}
