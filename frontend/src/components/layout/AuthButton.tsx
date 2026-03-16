'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/api';

export function AuthButton() {
  const pathname = usePathname();
  const { data: status } = useQuery({ queryKey: ['auth-status'], queryFn: auth.status, refetchInterval: 30_000 });
  const active = pathname === '/auth';

  return (
    <Link
      href="/auth"
      className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200',
        'border',
        active
          ? 'text-accent'
          : 'text-text-secondary hover:text-text-primary',
      )}
      style={{
        background: active ? 'var(--sidebar-active-bg)' : 'var(--input-bg)',
        borderColor: active ? 'var(--sidebar-active-border)' : 'var(--glass-border)',
        ...(active ? { boxShadow: 'var(--sidebar-active-shadow)' } : {}),
      }}
    >
      <ShieldCheck size={16} className="shrink-0" />
      <span>Auth</span>
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0',
        status?.is_authorized ? 'bg-success' : 'bg-danger',
      )} />
    </Link>
  );
}
