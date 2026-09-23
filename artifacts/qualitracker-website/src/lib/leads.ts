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

export async function submitLead(input: SubmitLeadInput): Promise<void> {
  if (input.kind === 'waitlist') {
    // EmailJS public identifiers are intended for browser use.
    // Recipient and CC addresses are fixed in the EmailJS template.
    if (input.website?.trim()) return;
    const required = [input.firstName, input.email, input.institution,
      input.organizationType, input.country, input.role, input.message];
    if (required.some((value) => !value?.trim()) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      throw new Error('INVALID_WAITLIST');
    }
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: 'service_h8tr7y8',
        template_id: 'template_v13pvti',
        user_id: '0Iofba0xfrTcxdb3_',
        template_params: {
          full_name: [input.firstName, input.lastName].filter(Boolean).join(' ').trim(),
          work_email: input.email.trim(),
          organization: input.institution?.trim(),
          organization_type: input.organizationType?.trim(),
          country: input.country?.trim(),
          role: input.role?.trim(),
          expectations: input.message?.trim(),
          submitted_at: new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('SUBMIT_FAILED');
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
