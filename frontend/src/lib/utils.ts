import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd MMM yyyy, HH:mm');
  } catch {
    return iso;
  }
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60)  return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function successRate(sent: number, failed: number): number {
  const total = sent + failed;
  if (total === 0) return 0;
  return Math.round((sent / total) * 100);
}

export function classForStatus(status: string): string {
  switch (status) {
    case 'sent':    return 'text-success';
    case 'failed':  return 'text-danger';
    case 'skipped': return 'text-warn';
    default:        return 'text-text-secondary';
  }
}
