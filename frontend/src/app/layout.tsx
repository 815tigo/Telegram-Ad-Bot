import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar, MobileHeader } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'AdBot — Control Center',
  description: 'Telegram Advertisement Automation Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-bg text-text-primary">
        <Providers>
          {/* Ambient background orbs (hidden in light mode via CSS) */}
          <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="orb w-[500px] h-[500px] -top-32 -left-16"
              style={{ background: 'radial-gradient(circle, #00c2ff, transparent 70%)', '--opacity': '0.12' } as React.CSSProperties} />
            <div className="orb w-[400px] h-[400px] bottom-[-60px] right-[-40px]"
              style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', '--opacity': '0.10' } as React.CSSProperties} />
          </div>

          {/* Desktop: sidebar + content side by side */}
          {/* Mobile: stacked header + scrollable content */}
          <div className="flex h-screen overflow-hidden relative z-10">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <MobileHeader />
              <main className="flex-1 overflow-y-auto">
                <div className="min-h-full p-4 sm:p-6 lg:p-8 animate-slide-in">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
