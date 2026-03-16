import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 size={18} className={cn('animate-spin text-accent', className)} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner className="w-6 h-6" />
    </div>
  );
}
