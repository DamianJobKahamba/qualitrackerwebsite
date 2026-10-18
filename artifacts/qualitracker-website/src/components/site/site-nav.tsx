import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/site/button';

const NAV_LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Docs', href: '/docs' },
  { label: 'Company', href: '/company' },
];

/** Sticky white nav bar: dual-tone lockup, teal active underline, teal CTA — matches the real brand kit's SiteNav. */
export function SiteNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--qt-border-grey)' }}>
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-8 px-5 lg:px-8">
        <Link href="/" aria-label="QualiTracker home" data-testid="link-brand-home">
          <Logo height={28} />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="pb-4 -mb-4 text-[13px] font-medium"
                style={{ color: active ? 'var(--qt-deep-teal)' : 'var(--qt-near-black)', borderBottom: active ? '2px solid var(--qt-deep-teal)' : '2px solid transparent' }}
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Button href="/talk-to-team" variant="ghost" size="sm">Talk to the team</Button>
          <Button href="/book-demo" variant="secondary" size="sm" data-testid="link-nav-book-demo">Book a demo</Button>
          <Button href="/waitlist" size="sm" data-testid="link-nav-waitlist">Join the waitlist</Button>
        </div>
        <button
          type="button"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md md:hidden"
          style={{ color: 'var(--qt-near-black)' }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          data-testid="button-mobile-menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="border-t px-5 py-3 md:hidden" style={{ borderColor: 'var(--qt-border-grey)' }} aria-label="Mobile navigation">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium" style={{ color: 'var(--qt-near-black)' }}>
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--qt-border-grey)' }}>
            <Button href="/book-demo" variant="secondary" onClick={() => setMenuOpen(false)} fullWidth>Book a demo</Button>
            <Button href="/talk-to-team" variant="secondary" onClick={() => setMenuOpen(false)} fullWidth>Talk to the team</Button>
            <Button href="/waitlist" onClick={() => setMenuOpen(false)} fullWidth>Join the waitlist</Button>
          </div>
        </nav>
      )}
    </header>
  );
}
