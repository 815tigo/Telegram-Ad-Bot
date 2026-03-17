'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Megaphone, Users, CalendarClock,
  ScrollText, MessageSquare, ShieldCheck, Zap,
  Sun, Moon, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/api';

const nav = [
  { href: '/',          label: 'Overview',   icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns',  icon: Megaphone       },
  { href: '/groups',    label: 'Groups',     icon: Users           },
  { href: '/schedules', label: 'Schedules',  icon: CalendarClock   },
  { href: '/logs',      label: 'Logs',       icon: ScrollText      },
  { href: '/replies',   label: 'Replies',    icon: MessageSquare   },
  { href: '/auth',      label: 'Auth',       icon: ShieldCheck     },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-10 h-10" />;

  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
        'border text-text-secondary hover:text-accent',
      )}
      style={{
        background: 'var(--input-bg)',
        borderColor: 'var(--glass-border)',
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function MobileHeader() {
  const pathname = usePathname();
  const { data: status } = useQuery({ queryKey: ['auth-status'], queryFn: auth.status, refetchInterval: 30_000 });
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Top bar */}
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--sidebar-bg)',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--sidebar-active-bg)', border: '1px solid var(--sidebar-active-border)' }}>
            <Zap size={18} className="text-accent" />
          </div>
          <div>
            <div className="text-base font-bold tracking-widest uppercase grad-text">AdBot</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', status?.is_authorized ? 'bg-success' : 'bg-danger')} />
          <ThemeToggle />
          <button
            onClick={() => setOpen(v => !v)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Slide-down nav */}
      <nav
        className={cn(
          'lg:hidden fixed left-0 right-0 z-35 overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0',
        )}
        style={{
          top: '60px',
          background: 'var(--sidebar-bg)',
          borderBottom: open ? '1px solid var(--sidebar-border)' : 'none',
          zIndex: 35,
        }}
      >
        <div className="px-3 py-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-[15px] font-medium transition-all duration-200 relative group',
                  active ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
                )}
                style={active ? {
                  background: 'var(--sidebar-active-bg)',
                  border: '1px solid var(--sidebar-active-border)',
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                }}
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-ring" />}
              </Link>
            );
          })}
        </div>

        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--white-alpha-4)' }}>
          <div className="flex items-center gap-3">
            <div className={cn('w-2.5 h-2.5 rounded-full', status?.is_authorized ? 'bg-success' : 'bg-danger')} />
            <span className={cn('text-sm font-semibold', status?.is_authorized ? 'text-success' : 'text-danger')}>
              {status?.is_authorized ? 'Connected' : 'Not Logged In'}
            </span>
            {status?.is_authorized && status.me_username && (
              <span className="text-xs text-text-muted mono">@{status.me_username}</span>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: status } = useQuery({ queryKey: ['auth-status'], queryFn: auth.status, refetchInterval: 30_000 });

  return (
    <aside className="hidden lg:flex w-[360px] shrink-0 flex-col h-full relative"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}>

      <div className="absolute right-0 top-0 bottom-0 w-px"
        style={{ background: 'var(--sidebar-edge)' }} />

      {/* Brand */}
      <div className="px-7 py-7" style={{ borderBottom: '1px solid var(--white-alpha-4)' }}>
        <div className="flex items-center gap-4">
          <div className="relative w-11 h-11 shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--sidebar-active-bg)', border: '1px solid var(--sidebar-active-border)' }}>
              <Zap size={22} className="text-accent" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold tracking-widest uppercase grad-text">AdBot</div>
            <div className="text-xs text-text-muted mono tracking-wider">control center</div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-4 px-5 py-3.5 rounded-lg text-[15px] font-medium transition-all duration-200 relative group',
                active
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary',
              )}
              style={active ? {
                background: 'var(--sidebar-active-bg)',
                border: '1px solid var(--sidebar-active-border)',
                boxShadow: 'var(--sidebar-active-shadow)',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}
            >
              {!active && (
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--sidebar-hover)' }} />
              )}

              <Icon size={20} className="shrink-0 relative z-10" />
              <span className="relative z-10">{label}</span>

              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-ring" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="px-7 py-6" style={{ borderTop: '1px solid var(--white-alpha-4)' }}>
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className={cn(
              'w-3 h-3 rounded-full',
              status?.is_authorized ? 'bg-success' : 'bg-danger',
            )} />
            {status?.is_authorized && (
              <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-40" />
            )}
          </div>
          <div>
            <div className={cn('text-sm font-semibold', status?.is_authorized ? 'text-success' : 'text-danger')}>
              {status?.is_authorized ? 'Connected' : 'Not Logged In'}
            </div>
            {status?.is_authorized && status.me_username && (
              <div className="text-xs text-text-muted mono mt-0.5">@{status.me_username}</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
