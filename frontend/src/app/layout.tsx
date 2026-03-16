import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar }     from '@/components/layout/Sidebar';
import { AuthButton }  from '@/components/layout/AuthButton';

export const metadata: Metadata = {
  title: 'AdBot — Control Center',
  description: 'Telegram Advertisement Automation Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-text-primary">
        <Providers>
          {/* Ambient background orbs (hidden in light mode via CSS) */}
          <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="orb w-[500px] h-[500px] -top-32 -left-16"
              style={{ background: 'radial-gradient(circle, #00c2ff, transparent 70%)', '--opacity': '0.12' } as React.CSSProperties} />
            <div className="orb w-[400px] h-[400px] bottom-[-60px] right-[-40px]"
              style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', '--opacity': '0.10' } as React.CSSProperties} />
          </div>

          <div className="flex h-screen overflow-hidden relative z-10">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative">
              <div className="absolute top-6 right-8 z-20">
                <AuthButton />
              </div>
              <div className="min-h-full p-8 animate-slide-in">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
