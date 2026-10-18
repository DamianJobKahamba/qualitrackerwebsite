export type LeadKind = 'newsletter' | 'demo_request' | 'waitlist' | 'talk_to_team';

export interface SubmitLeadInput {
  kind: LeadKind;
  email: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  role?: string;
  country?: string;
  /** e.g. "Medical laboratory", "Multi-site network" — waitlist/talk-to-team only. */
  organizationType?: string;
  /** Free-text context: waitlist detail, or a talk-to-team inquiry (prefix with its category). */
  message?: string;
  source: string; // where on the site this came from, e.g. "homepage-hero", "footer"
  consent: boolean;
  /** Honeypot passthrough — leave undefined for real users. */
  website?: string;
}

// Simple honeypot field name shared with the backend. Rendered
// visually hidden in the form; real users never see or fill it.
export const HONEYPOT_FIELD_NAME = 'website';

const EMAILJS = {
  endpoint: 'https://api.emailjs.com/api/v1.0/email/send',
  serviceId: 'service_h8tr7y8',
  // EmailJS public identifiers are intended for browser use.
  publicKey: '0Iofba0xfrTcxdb3_',
  templates: {
    waitlist: 'template_v13pvti',
    // INTERIM: talk-to-the-team shares the waitlist template, so the email's
    // subject and "Source" line say "Waitlist" (the message body is prefixed
    // with the inquiry type). Create a dedicated EmailJS template for
    // inquiries and change this ID — no other code needs to change.
    talk_to_team: 'template_v13pvti',
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendViaEmailJs(kind: 'waitlist' | 'talk_to_team', params: Record<string, string | undefined>) {
  // Recipient and CC addresses are fixed in the EmailJS template, never
  // visitor-controlled.
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

export async function submitLead(input: SubmitLeadInput): Promise<void> {
  if (input.kind === 'waitlist') {
    if (input.website?.trim()) return;
    const required = [input.firstName, input.email, input.institution,
      input.organizationType, input.country, input.role, input.message];
    if (required.some((value) => !value?.trim()) || !EMAIL_PATTERN.test(input.email.trim())) {
      throw new Error('INVALID_WAITLIST');
    }
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
    // This path used to POST to /api/leads, which does not exist on the
    // static host (HTTP 405) — every submission failed. It now goes through
    // EmailJS like the waitlist.
    if (input.website?.trim()) return;
    if (!input.firstName?.trim() || !input.message?.trim() || !EMAIL_PATTERN.test(input.email.trim())) {
      throw new Error('INVALID_TALK_TO_TEAM');
    }
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

  const params = new URLSearchParams(window.location.search);

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      landingPage: window.location.pathname,
      referrer: document.referrer || undefined,
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      utmTerm: params.get('utm_term') ?? undefined,
      utmContent: params.get('utm_content') ?? undefined,
    }),
  });

  if (res.status === 409) {
    throw new Error('ALREADY_SUBSCRIBED');
  }
  if (!res.ok) {
    throw new Error('SUBMIT_FAILED');
  }
}
