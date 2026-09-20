import { Link } from 'wouter';
import { PageShell } from '@/components/site/page-shell';
import { SectionHeader } from '@/components/site/section-header';
import { Button } from '@/components/site/button';
import { StatusBadge } from '@/components/site/status-badge';
import { TechnicalRecordBlock } from '@/components/site/technical-block';
import { useDocumentMeta } from '@/lib/use-document-meta';

// Medical laboratories get the featured slot deliberately — it's the
// segment every other real page (product/security/company) is written
// against; the rest are real segments too, just not yet the primary focus.
const FEATURED_SEGMENT = { label: 'Medical laboratories', copy: 'Clinical diagnostics labs working toward ISO 15189, WHO LQMS, or SLIPTA readiness — the segment the current product is built and verified against.' };
const OTHER_SEGMENTS = [
  { label: 'Testing laboratories', copy: 'Non-clinical testing labs with their own document-control and quality-record needs.' },
  { label: 'Research laboratories', copy: 'Research settings that need traceable documentation without a clinical QMS.' },
  { label: 'Multi-site organizations', copy: 'Networks and institutions coordinating quality across more than one facility.' },
];

/** Segment-specific positioning is still being written — honest stub, not fabricated depth. */
function SolutionsPage() {
  useDocumentMeta(
    'Solutions — QualiTracker',
    'QualiTracker for medical, testing, and research laboratories, and multi-site organizations.',
    '/solutions',
  );
  return (
    <PageShell>
      <section className="py-16 lg:py-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="qt-eyebrow qt-eyebrow-light">Solutions</p>
          <h1 className="font-brand mt-3 max-w-[640px] text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-[-.02em]" style={{ color: '#FFFFFF' }}>
            Built for quality-intensive laboratory work.
          </h1>
        </div>
      </section>

      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="Who we're building for" title="Segment-specific pages are in progress." />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="qt-card-dark flex flex-col justify-between p-8" data-testid="card-segment-medical-laboratories">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="qt-eyebrow qt-eyebrow-light">Primary segment</p>
                  <StatusBadge status="in-development" />
                </div>
                <h3 className="font-brand text-2xl font-bold" style={{ color: '#FFFFFF' }}>{FEATURED_SEGMENT.label}</h3>
                <p className="mt-3 max-w-[420px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>{FEATURED_SEGMENT.copy}</p>
              </div>
            </div>
            <div className="space-y-4">
              {OTHER_SEGMENTS.map((seg) => (
                <div key={seg.label} className="qt-card p-5" data-testid={`card-segment-${seg.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-brand text-sm font-bold" style={{ color: 'var(--qt-near-black)' }}>{seg.label}</h3>
                    <StatusBadge status="in-development" />
                  </div>
                  <p className="text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>{seg.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="What every segment shares" title="One core system, whatever the setting." />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <p className="max-w-[440px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
              The segment pages above are about positioning, not a different product — every laboratory type runs on the same QMS Module and QualiBOT stack described on <Link href="/product" style={{ color: 'var(--qt-deep-teal)' }}>the product page</Link>. What changes by segment is which standards and workflows matter most, not the underlying system.
            </p>
            <TechnicalRecordBlock
              eyebrow="SYSTEM / ALL SEGMENTS"
              fields={[
                { label: 'CORE STACK', value: 'QMS Module + QualiBOT' },
                { label: 'STANDARDS', value: 'ISO 15189 · SLIPTA · WHO LQMS' },
                { label: 'SEGMENT PAGES', value: 'IN DEVELOPMENT' },
              ]}
            />
          </div>
          <p className="mt-8 max-w-[520px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
            If you'd like to talk through your laboratory's specific setup before these pages are ready, reach out directly.
          </p>
          <div className="mt-6">
            <Button href="/talk-to-team" variant="secondary">Talk to the team</Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default SolutionsPage;
