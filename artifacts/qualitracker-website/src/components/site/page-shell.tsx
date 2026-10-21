import type { ReactNode } from 'react';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="qt-site flex min-h-dvh flex-col">
      <a href="#main" className="qt-skip-link">Skip to main content</a>
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <SiteFooter />
    </div>
  );
}
