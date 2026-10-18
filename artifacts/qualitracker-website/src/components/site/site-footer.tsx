import { Link } from 'wouter';
import { Logo } from '@/components/brand/logo';

const COLUMNS: Array<[string, Array<{ label: string; href: string }>]> = [
  ['Product', [
    { label: 'Platform', href: '/product' },
    { label: 'AI & RAG', href: '/product#ai-rag' },
    { label: 'Docs', href: '/docs' },
  ]],
  ['Company', [
    { label: 'About', href: '/company' },
    { label: 'Team', href: '/company#team' },
    { label: 'Vision', href: '/company#vision' },
  ]],
  ['Get started', [
    { label: 'Join the waitlist', href: '/waitlist' },
    { label: 'Book a demo', href: '/book-demo' },
    { label: 'Talk to the team', href: '/talk-to-team' },
    { label: 'Security', href: '/security' },
  ]],
];

/** Dark Navy footer, reversed lockup, gold column headings — matches the real brand kit. */
export function SiteFooter() {
  return (
    <footer style={{ background: 'var(--qt-dark-navy)', color: '#FFFFFF' }}>
      <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Logo tone="reversed" height={26} />
            <p className="max-w-[260px] text-[13px] leading-6" style={{ color: 'var(--qt-mint-light)' }}>
              Digital quality-management infrastructure for laboratories, built in East Africa.
            </p>
          </div>
          {COLUMNS.map(([heading, items]) => (
            <div key={heading} className="flex flex-col gap-3">
              <span className="qt-eyebrow qt-eyebrow-light">{heading}</span>
              {items.map((item) => (
                <Link key={item.label} href={item.href} className="text-[13px]" style={{ color: '#FFFFFF' }} data-testid={`link-footer-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-[11px] sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(255,255,255,.12)', color: 'var(--qt-light-teal)' }}>
          <span>
            © {new Date().getFullYear()} Qualitracker Limited · Dar es Salaam, Tanzania ·{' '}
            <Link href="/privacy" className="underline" data-testid="link-footer-privacy">Privacy notice</Link>
          </span>
          <span>Building quality-management infrastructure for laboratories — East Africa first.</span>
        </div>
      </div>
    </footer>
  );
}
