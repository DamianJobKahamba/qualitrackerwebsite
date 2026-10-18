import { PageShell } from '@/components/site/page-shell';
import { useDocumentMeta } from '@/lib/use-document-meta';

/**
 * A plain-language description of what this site actually does with
 * submitted details, written strictly from the code (lib/leads.ts): two
 * forms, sent as email through EmailJS, no database, no cookies, no
 * analytics. It deliberately does NOT assert a legal basis, retention
 * period or jurisdiction-specific rights we haven't decided — those need
 * counsel. Update this page whenever the data flow changes (e.g. when
 * analytics or a CRM is added).
 */
const SECTIONS: Array<{ heading: string; body: string[] }> = [
  {
    heading: 'What we collect',
    body: [
      'Only what you type into the two forms on this site. Join the waitlist: your name, work email, organization, organization type, country, role, and what you expect from the product. Talk to the team: your name, work email, the type of inquiry, your message, and optionally your organization and country.',
    ],
  },
  {
    heading: 'Why we collect it',
    body: ['To reply to you — about early access to QualiTracker, or about the inquiry you sent. We don\'t use these details for anything else.'],
  },
  {
    heading: 'Where it goes',
    body: [
      'When you submit a form, your details are sent as an email to the QualiTracker team through EmailJS, a third-party email-sending service. The team\'s inbox is where they are read and kept. This website itself has no database and does not store what you submit.',
    ],
  },
  {
    heading: 'Cookies, analytics and fonts',
    body: [
      'At the time of writing this site sets no cookies and runs no analytics. Page fonts are loaded from Google Fonts, which means your browser contacts Google to fetch them, as with any site that uses them. If we add analytics later we will update this notice first.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: ['We keep submissions only as long as we need them to follow up. We have not set a fixed retention period yet; when we do, it will be stated here.'],
  },
  {
    heading: 'Your choices',
    body: ['You can ask us what we hold about you, ask us to correct it, or ask us to delete it, by writing to info@qualitracker.com.'],
  },
];

function PrivacyPage() {
  useDocumentMeta('Privacy notice — QualiTracker', 'What QualiTracker collects through its website forms, where it goes, and how to ask us to change or delete it.', '/privacy');
  return (
    <PageShell>
      <section className="py-16 lg:py-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="qt-eyebrow qt-eyebrow-light">Privacy</p>
          <h1 className="font-brand mt-3 max-w-[640px] text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-[-.02em]" style={{ color: '#FFFFFF' }}>
            Privacy notice.
          </h1>
          <p className="mt-5 max-w-[480px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
            What this website collects, where it goes, and how to ask us to change or delete it.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[720px] px-5 lg:px-8">
          <p className="qt-technical-label mb-8" data-testid="privacy-draft-banner">
            Draft — pending legal review. Qualitracker Limited, Dar es Salaam, Tanzania.
          </p>
          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <div key={s.heading}>
                <h2 className="font-brand text-lg font-bold" style={{ color: 'var(--qt-near-black)' }}>{s.heading}</h2>
                {s.body.map((p) => (
                  <p key={p} className="mt-2 text-sm leading-7" style={{ color: 'var(--qt-body-grey)' }}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default PrivacyPage;
