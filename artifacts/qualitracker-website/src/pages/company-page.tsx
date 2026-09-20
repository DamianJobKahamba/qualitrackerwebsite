import { PageShell } from '@/components/site/page-shell';
import { SectionHeader } from '@/components/site/section-header';
import { Button } from '@/components/site/button';
import { AccreditationVisionSection } from '@/components/site/accreditation-vision';
import { useDocumentMeta, useStructuredData } from '@/lib/use-document-meta';

const MISSION = { eyebrow: 'Mission', title: 'Replace the binder.', copy: 'Empower every medical laboratory in East Africa with affordable, intelligent, standards-aligned quality-management tools.' };
const SECONDARY_PILLARS = [
  { eyebrow: 'Vision', title: 'A regional standard', copy: 'Become the leading laboratory quality-management platform across Sub-Saharan Africa.' },
  { eyebrow: 'Essence', title: 'Quality Through Digital Precision', copy: 'The single idea every QualiTracker touchpoint must communicate.' },
];

const VALUES = ['Scientific Accuracy', 'African-First Design', 'Radical Accessibility', 'Transparency & Accountability', 'Community Before Capital'];

// Founding team — name and role only, per explicit instruction not to invent
// bios, employers, universities, credentials, or quotes.
const TEAM = [
  { initials: 'DJK', name: 'Damian Job Kahamba', role: 'Chief Executive Officer' },
  { initials: 'JM', name: 'Justin Mafie', role: 'Chief Technology Officer' },
  { initials: 'IM', name: 'Ibrahim Mauki', role: 'Chief Marketing Officer' },
  { initials: 'RB', name: 'Robert Baluhya', role: 'Chief Product Officer' },
  { initials: 'HM', name: 'Henry Mlay', role: 'Chief Operations Officer' },
  { initials: 'LN', name: 'Leah Nanyaro', role: 'Chief Community Officer / Finance' },
  { initials: 'NG', name: 'Nickson Gabriel', role: 'Chief Strategy Officer' },
];

// Built directly from TEAM above — never a separate, hand-maintained list
// that could drift from the real roster shown on the page.
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Qualitracker Limited',
  url: 'https://qualitracker.com/company',
  founder: TEAM.map((person) => ({ '@type': 'Person', name: person.name, jobTitle: person.role })),
};

function CompanyPage() {
  useDocumentMeta(
    'Company — QualiTracker',
    'Qualitracker Limited is building digital quality infrastructure for laboratories, built in East Africa for East Africa.',
    '/company',
  );
  useStructuredData(ORGANIZATION_SCHEMA);
  return (
    <PageShell>
      <section className="py-16 lg:py-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="qt-eyebrow qt-eyebrow-light">Company</p>
          <h1 className="font-brand mt-3 max-w-[640px] text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-[-.02em]" style={{ color: '#FFFFFF' }}>
            Built in East Africa, for East Africa.
          </h1>
          <p className="mt-5 max-w-[480px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
            Qualitracker Limited is building digital quality infrastructure for laboratories — starting with the everyday reality of running a quality system on paper.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-24" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            {/* Mission gets the editorial, large-type treatment — the one
                statement everything else on this page supports. */}
            <div className="qt-card-dark flex flex-col justify-center p-9 lg:p-12">
              <p className="qt-eyebrow qt-eyebrow-light">{MISSION.eyebrow}</p>
              <h2 className="font-display mt-3 text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.08]" style={{ color: '#FFFFFF' }}>
                {MISSION.title}
              </h2>
              <p className="mt-4 max-w-[440px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>{MISSION.copy}</p>
            </div>
            <div className="flex flex-col gap-4">
              {SECONDARY_PILLARS.map((p) => (
                <div key={p.eyebrow} className="qt-card p-6">
                  <p className="qt-eyebrow">{p.eyebrow}</p>
                  <h3 className="font-brand mt-2 text-lg font-bold" style={{ color: 'var(--qt-near-black)' }}>{p.title}</h3>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>{p.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {VALUES.map((v) => (
              <span key={v} className="font-mono-ui rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[.06em]" style={{ background: 'var(--qt-lab-grey)', color: 'var(--qt-body-grey)' }}>
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="py-20 lg:py-24" style={{ background: 'var(--qt-lab-grey)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <SectionHeader eyebrow="Founding team" title="The people building QualiTracker." />
          {/* A directory list, not a grid of identical avatar cards — every
              row carries equal visual weight (no invented seniority tiers
              among the founders), the technical-mono role label is the one
              new texture over the equivalent list on /security and /product. */}
          <div className="mt-10 divide-y" style={{ borderColor: 'var(--qt-border-grey)' }}>
            {TEAM.map((person) => (
              <div
                key={person.initials}
                className="flex flex-wrap items-center justify-between gap-3 border-t py-4 first:border-t-0"
                style={{ borderColor: 'var(--qt-border-grey)' }}
                data-testid={`card-team-${person.initials.toLowerCase()}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="font-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--qt-teal-tint)', color: 'var(--qt-deep-teal)' }}
                  >
                    {person.initials}
                  </span>
                  <h3 className="font-brand text-base font-bold" style={{ color: 'var(--qt-near-black)' }}>{person.name}</h3>
                </div>
                <p className="qt-technical-label">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AccreditationVisionSection />

      <section className="py-16 lg:py-20" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto flex max-w-[1280px] flex-col items-center px-5 text-center lg:px-8">
          <h2 className="font-brand text-2xl font-bold" style={{ color: 'var(--qt-near-black)' }}>Want to build with us, or learn more?</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button href="/waitlist" variant="gold">Join the waitlist</Button>
            <Button href="/talk-to-team" variant="secondary">Talk to the team</Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default CompanyPage;
