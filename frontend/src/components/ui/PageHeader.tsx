interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 lg:mb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
