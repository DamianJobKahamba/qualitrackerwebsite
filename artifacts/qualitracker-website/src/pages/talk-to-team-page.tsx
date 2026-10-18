import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'wouter';
import { PageShell } from '@/components/site/page-shell';
import { TextField, SelectField, TextareaField } from '@/components/site/form-field';
import { HONEYPOT_FIELD_NAME, submitLead } from '@/lib/leads';
import { useDocumentMeta } from '@/lib/use-document-meta';

const CATEGORIES = [
  'Laboratory interest',
  'Institutional partnership',
  'Regulatory / accreditation discussion',
  'Technical integration',
  'Research collaboration',
  'General inquiry',
];

function TalkToTeamPage() {
  useDocumentMeta('Talk to the team — QualiTracker', 'Reach the QualiTracker team for institutional, regulatory, or partnership inquiries.', '/talk-to-team');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const honeypot = data.get(HONEYPOT_FIELD_NAME);

    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const institution = String(data.get('institution') ?? '').trim();
    const country = String(data.get('country') ?? '').trim();
    const category = String(data.get('category') ?? '').trim();
    const note = String(data.get('message') ?? '').trim();
    const consent = data.get('consent') === 'on';

    if (!name || !email || !category) {
      setError('Please fill in your name, email, and inquiry type.');
      return;
    }
    if (!consent) {
      setError('Please confirm you have read the Privacy Notice.');
      return;
    }

    setSubmitting(true);
    try {
      await submitLead({
        kind: 'talk_to_team',
        email,
        firstName: name,
        institution: institution || undefined,
        country: country || undefined,
        message: `Inquiry: ${category}${note ? `\n\n${note}` : ''}`,
        source: 'talk-to-team-page',
        consent,
        website: honeypot ? String(honeypot) : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error && err.message === 'ALREADY_SUBSCRIBED' ? "We've already got a message from this email." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <section className="py-16 lg:py-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="qt-eyebrow qt-eyebrow-light">Institutional inquiries</p>
          <h1 className="font-brand mt-3 max-w-[560px] text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.1] tracking-[-.02em]" style={{ color: '#FFFFFF' }}>
            Talk to the team.
          </h1>
          <p className="mt-4 max-w-[440px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
            For laboratories, institutions, regulators, partners, and researchers evaluating QualiTracker directly.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto max-w-[560px] px-5 lg:px-8">
          {submitted ? (
            <div className="qt-card flex flex-col items-center p-10 text-center">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--qt-teal-tint)', color: 'var(--qt-deep-teal)' }}>
                <Check size={23} />
              </span>
              <h2 className="font-brand text-2xl font-bold" style={{ color: 'var(--qt-near-black)' }}>Message received.</h2>
              <p className="mt-3 max-w-[360px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
                Thank you for reaching out — we'll route this to the right person on the team and follow up.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="qt-card space-y-4 p-8">
              <TextField label="Full name" name="name" required placeholder="Your name" data-testid="input-talk-name" />
              <TextField label="Work email" name="email" type="email" required placeholder="you@organization.org" data-testid="input-talk-email" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Organization (optional)" name="institution" placeholder="Organization or institution" data-testid="input-talk-institution" />
                <TextField label="Country (optional)" name="country" placeholder="Country" data-testid="input-talk-country" />
              </div>
              <SelectField label="What's this about?" name="category" required defaultValue="" data-testid="select-talk-category">
                <option value="" disabled>Select an inquiry type</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </SelectField>
              <TextareaField label="Message (optional)" name="message" placeholder="Tell us a bit more…" data-testid="textarea-talk-message" />
              <label className="flex items-start gap-3 text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>
                <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: 'var(--qt-deep-teal)' }} data-testid="checkbox-talk-consent" />
                <span>
                  I have read the <Link href="/privacy" className="underline" style={{ color: 'var(--qt-deep-teal)' }}>Privacy Notice</Link> and agree that QualiTracker may use these details to reply to my message.
                </span>
              </label>
              <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                Leave this field empty
                <input tabIndex={-1} autoComplete="off" name={HONEYPOT_FIELD_NAME} />
              </label>
              {error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--qt-error)' }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="qt-button qt-focus flex w-full items-center justify-center rounded-md text-sm font-semibold"
                style={{ height: 44, background: 'var(--qt-deep-teal)', color: '#FFFFFF', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                data-testid="button-submit-talk"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export default TalkToTeamPage;
