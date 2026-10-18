export type LeadKind = 'waitlist' | 'talk_to_team' | 'demo_request';

export interface SubmitLeadInput {
  kind: LeadKind;
  email: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  role?: string;
  country?: string;
  /** e.g. "Medical laboratory", "Multi-site network" — waitlist only. */
  organizationType?: string;
  /** Free-text context: waitlist expectations, an inquiry (prefixed with its category), or demo notes. */
  message?: string;
  /** demo_request only: ISO date (YYYY-MM-DD) the visitor would like, plus an optional backup. */
  preferredDate?: string;
  backupDate?: string;
  /** demo_request only: e.g. "Morning (09:00–12:00)". */
  preferredTime?: string;
  /** demo_request only: IANA zone the visitor's times are in, e.g. "Africa/Dar_es_Salaam". */
  timezone?: string;
  source: string; // where on the site this came from, e.g. "waitlist-page"
  consent: boolean;
  /** Honeypot passthrough — leave undefined for real users. */
  website?: string;
}

// Simple honeypot field name. Rendered visually hidden in the form; real
// users never see or fill it.
export const HONEYPOT_FIELD_NAME = 'website';

const EMAILJS = {
  endpoint: 'https://api.emailjs.com/api/v1.0/email/send',
  serviceId: 'service_h8tr7y8',
  // EmailJS public identifiers are intended for browser use.
  publicKey: '0Iofba0xfrTcxdb3_',
  templates: {
    waitlist: 'template_v13pvti',
    // INTERIM: talk-to-the-team and demo requests share the waitlist template,
    // so the email's subject and "Source" line say "Waitlist" (the body is
    // prefixed with the inquiry type / "DEMO REQUEST"). Create dedicated
    // EmailJS templates (see docs/WAITLIST_EMAIL_SETUP.md) and change these
    // IDs — no other code needs to change.
    talk_to_team: 'template_v13pvti',
    demo_request: 'template_v13pvti',
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function sendViaEmailJs(kind: LeadKind, params: Record<string, string | undefined>) {
  // Recipient and CC addresses are fixed in the EmailJS template, never
  // visitor-controlled; Reply-To is the visitor's work_email so the team can
  // answer straight from their inbox.
  const response = await fetch(EMAILJS.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templates[kind],
      user_id: EMAILJS.publicKey,
      template_params: params,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('SUBMIT_FAILED');
}

/** "Tue, 3 Nov 2026" — computed from the ISO parts, never via a timezone-shifting Date parse. */
export function formatDemoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export async function submitLead(input: SubmitLeadInput): Promise<void> {
  // Honeypot: silently succeed for bots without sending anything.
  if (input.website?.trim()) return;

  if (!input.email || !EMAIL_PATTERN.test(input.email.trim())) {
    throw new Error(`INVALID_${input.kind.toUpperCase()}`);
  }

  if (input.kind === 'waitlist') {
    const required = [input.firstName, input.institution, input.organizationType, input.country, input.role, input.message];
    if (required.some((value) => !value?.trim())) throw new Error('INVALID_WAITLIST');
    if (!input.consent) throw new Error('CONSENT_REQUIRED');
    await sendViaEmailJs('waitlist', {
      full_name: [input.firstName, input.lastName].filter(Boolean).join(' ').trim(),
      work_email: input.email.trim(),
      organization: input.institution?.trim(),
      organization_type: input.organizationType?.trim(),
      country: input.country?.trim(),
      role: input.role?.trim(),
      expectations: input.message?.trim(),
      submitted_at: new Date().toISOString(),
    });
    return;
  }

  if (input.kind === 'talk_to_team') {
    if (!input.firstName?.trim() || !input.message?.trim()) throw new Error('INVALID_TALK_TO_TEAM');
    if (!input.consent) throw new Error('CONSENT_REQUIRED');
    await sendViaEmailJs('talk_to_team', {
      full_name: input.firstName.trim(),
      work_email: input.email.trim(),
      organization: input.institution?.trim() || 'Not provided',
      organization_type: 'Talk to the team inquiry',
      country: input.country?.trim() || 'Not provided',
      role: 'Not provided',
      expectations: input.message.trim(),
      submitted_at: new Date().toISOString(),
    });
    return;
  }

  // demo_request
  if (
    !input.firstName?.trim() ||
    !input.institution?.trim() ||
    !input.preferredDate || !DATE_PATTERN.test(input.preferredDate) ||
    (input.backupDate && !DATE_PATTERN.test(input.backupDate)) ||
    !input.preferredTime?.trim()
  ) {
    throw new Error('INVALID_DEMO_REQUEST');
  }
  if (!input.consent) throw new Error('CONSENT_REQUIRED');
  const lines = [
    'DEMO REQUEST — not yet scheduled. Reply to this email to confirm a time or propose another.',
    '',
    `Preferred date: ${formatDemoDate(input.preferredDate)} (${input.preferredDate})`,
    ...(input.backupDate ? [`Backup date: ${formatDemoDate(input.backupDate)} (${input.backupDate})`] : []),
    `Preferred time: ${input.preferredTime.trim()}`,
    `Visitor's time zone: ${input.timezone?.trim() || 'Not provided'}`,
    ...(input.message?.trim() ? ['', `Notes: ${input.message.trim()}`] : []),
  ];
  await sendViaEmailJs('demo_request', {
    full_name: input.firstName.trim(),
    work_email: input.email.trim(),
    organization: input.institution.trim(),
    organization_type: 'Demo request',
    country: input.country?.trim() || 'Not provided',
    role: input.role?.trim() || 'Not provided',
    expectations: lines.join('\n'),
    submitted_at: new Date().toISOString(),
  });
}
