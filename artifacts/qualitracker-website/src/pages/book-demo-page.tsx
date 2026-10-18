import { useMemo, useState, type FormEvent } from 'react';
import { CalendarCheck, Check, Mail, Reply } from 'lucide-react';
import { Link } from 'wouter';
import { PageShell } from '@/components/site/page-shell';
import { TextField, SelectField, TextareaField } from '@/components/site/form-field';
import { HONEYPOT_FIELD_NAME, formatDemoDate, submitLead } from '@/lib/leads';
import { useDocumentMeta } from '@/lib/use-document-meta';

// Windows, not exact slots: this form never checks anyone's availability, it
// only tells the team what suits the visitor. The team confirms by email.
const TIME_WINDOWS = ['Morning (09:00–12:00)', 'Midday (12:00–15:00)', 'Late afternoon (15:00–18:00)'];

/** Local-calendar YYYY-MM-DD, `offsetDays` from today (no UTC shift). */
function localISODate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STEPS = [
  { icon: <CalendarCheck size={18} />, title: 'You pick a date and time window', copy: 'Choose what suits you, plus an optional backup date.' },
  { icon: <Mail size={18} />, title: 'It lands in our inbox', copy: 'The request goes to the QualiTracker team by email.' },
  { icon: <Reply size={18} />, title: 'We confirm or suggest another time', copy: 'Nothing is booked until we reply to you by email.' },
];

function BookDemoPage() {
  useDocumentMeta(
    'Book a demo — QualiTracker',
    'Request a QualiTracker demo: choose a preferred date and time, and the team will confirm by email.',
    '/book-demo',
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ email: string; date: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recomputed per render so a tab left open overnight doesn't offer "today".
  const minDate = localISODate(1);
  const maxDate = localISODate(120);
  const timezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? '').trim();

    const name = get('name');
    const email = get('email');
    const institution = get('institution');
    const preferredDate = get('preferredDate');
    const backupDate = get('backupDate');
    const preferredTime = get('preferredTime');

    if (!name || !email || !institution || !preferredDate || !preferredTime) {
      setError('Please fill in your name, email, organization, preferred date and time window.');
      return;
    }
    if (preferredDate < minDate || preferredDate > maxDate || (backupDate && (backupDate < minDate || backupDate > maxDate))) {
      setError('Please choose dates from tomorrow onward (up to four months ahead).');
      return;
    }
    if (backupDate && backupDate === preferredDate) {
      setError('Your backup date should be different from your preferred date.');
      return;
    }
    if (data.get('consent') !== 'on') {
      setError('Please confirm you have read the Privacy Notice.');
      return;
    }

    setSubmitting(true);
    try {
      await submitLead({
        kind: 'demo_request',
        email,
        firstName: name,
        institution,
        role: get('role') || undefined,
        country: get('country') || undefined,
        preferredDate,
        backupDate: backupDate || undefined,
        preferredTime,
        timezone: timezone || undefined,
        message: get('message') || undefined,
        source: 'book-demo-page',
        consent: true,
        website: get(HONEYPOT_FIELD_NAME) || undefined,
      });
      setSubmitted({ email, date: preferredDate });
    } catch {
      setError('Something went wrong sending your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <section className="py-16 lg:py-20 qt-texture-grid" style={{ backgroundColor: 'var(--qt-dark-navy)' }}>
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="qt-eyebrow qt-eyebrow-light">Product demo</p>
          <h1 className="font-brand mt-3 max-w-[560px] text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.1] tracking-[-.02em]" style={{ color: '#FFFFFF' }}>
            Book a demo.
          </h1>
          <p className="mt-4 max-w-[460px] text-sm leading-6" style={{ color: 'var(--qt-mint-light)' }}>
            Choose a date and time that suits you. This is a request, not an instant booking — we'll confirm by email, or suggest another time.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20" style={{ background: 'var(--qt-clinical-white)' }}>
        <div className="mx-auto grid max-w-[1000px] gap-10 px-5 lg:grid-cols-[1fr_300px] lg:px-8">
          <div>
            {submitted ? (
              <div className="qt-card flex flex-col items-center p-10 text-center" role="status">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--qt-teal-tint)', color: 'var(--qt-deep-teal)' }}>
                  <Check size={23} />
                </span>
                <h2 className="font-brand text-2xl font-bold" style={{ color: 'var(--qt-near-black)' }}>Request received.</h2>
                <p className="mt-3 max-w-[380px] text-sm leading-6" style={{ color: 'var(--qt-body-grey)' }}>
                  You asked for <strong>{formatDemoDate(submitted.date)}</strong>. It isn't booked yet — we'll reply to <strong>{submitted.email}</strong> to confirm that time or suggest another.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="qt-card space-y-4 p-8" noValidate={false}>
                <TextField label="Full name" name="name" required autoComplete="name" placeholder="Your name" data-testid="input-demo-name" />
                <TextField label="Work email" name="email" type="email" required autoComplete="email" placeholder="you@yourlab.org" data-testid="input-demo-email" />
                <TextField label="Laboratory / organization" name="institution" required autoComplete="organization" placeholder="Regional medical laboratory" data-testid="input-demo-institution" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Your role (optional)" name="role" placeholder="e.g. Quality manager" data-testid="input-demo-role" />
                  <TextField label="Country (optional)" name="country" autoComplete="country-name" placeholder="Country" data-testid="input-demo-country" />
                </div>

                <fieldset className="space-y-4 rounded-md p-4" style={{ border: '1px solid var(--qt-border-grey)' }}>
                  <legend className="px-1 text-xs font-semibold" style={{ color: 'var(--qt-near-black)' }}>When suits you?</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Preferred date" name="preferredDate" type="date" required min={minDate} max={maxDate} data-testid="input-demo-date" />
                    <TextField label="Backup date (optional)" name="backupDate" type="date" min={minDate} max={maxDate} data-testid="input-demo-backup-date" />
                  </div>
                  <SelectField label="Preferred time window" name="preferredTime" required defaultValue="" data-testid="select-demo-time">
                    <option value="" disabled>Select a time window</option>
                    {TIME_WINDOWS.map((t) => <option key={t}>{t}</option>)}
                  </SelectField>
                  <p className="text-[11px] leading-4" style={{ color: 'var(--qt-body-grey)' }}>
                    {timezone ? <>Times are in your time zone: <span className="qt-technical-value">{timezone}</span>.</> : 'Times are in your local time zone.'}
                  </p>
                </fieldset>

                <TextareaField label="Anything we should know? (optional)" name="message" placeholder="e.g. what you'd like to see, number of attendees…" data-testid="textarea-demo-message" />
                <label className="flex items-start gap-3 text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>
                  <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: 'var(--qt-deep-teal)' }} data-testid="checkbox-demo-consent" />
                  <span>
                    I have read the <Link href="/privacy" className="underline" style={{ color: 'var(--qt-deep-teal)' }}>Privacy Notice</Link> and agree that QualiTracker may use these details to arrange this demo.
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
                  style={{ height: 44, background: 'var(--qt-quality-gold)', color: 'var(--qt-dark-navy)', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                  data-testid="button-submit-demo"
                >
                  {submitting ? 'Sending…' : 'Request this time'}
                </button>
              </form>
            )}
          </div>

          <aside aria-label="How booking works" className="lg:pt-2">
            <h2 className="qt-technical-eyebrow mb-4">How it works</h2>
            <ol className="space-y-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--qt-teal-tint)', color: 'var(--qt-deep-teal)' }}>{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--qt-near-black)' }}><span className="qt-technical-id mr-1.5">{i + 1}</span>{s.title}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'var(--qt-body-grey)' }}>{s.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

export default BookDemoPage;
