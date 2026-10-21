import { GoogleAuth } from 'google-auth-library';
import type { Lead } from './validate.ts';

export interface OutboundMail {
  to: string;
  from: string;
  fromName: string;
  /** The visitor's address, so "Reply" in the inbox goes straight to them. */
  replyTo: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: OutboundMail): Promise<void>;
}

const KIND_LABEL: Record<Lead['kind'], string> = {
  waitlist: 'Waitlist signup',
  talk_to_team: 'Inquiry',
  demo_request: 'Demo request',
};

/** "Tue, 3 Nov 2026" from the ISO parts, never via a timezone-shifting Date parse. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export function composeLeadEmail(lead: Lead, leadId: string, now: Date, to: string, from: string): OutboundMail {
  const label = KIND_LABEL[lead.kind];
  const who = lead.organization ? `${lead.name} (${lead.organization})` : lead.name;
  const lines: string[] = [];

  if (lead.kind === 'demo_request') {
    lines.push('DEMO REQUEST — not yet scheduled. Reply to this email to confirm a time or propose another.', '');
    lines.push(`Preferred date: ${formatDate(lead.preferredDate)} (${lead.preferredDate})`);
    if (lead.backupDate) lines.push(`Backup date: ${formatDate(lead.backupDate)} (${lead.backupDate})`);
    lines.push(`Preferred time: ${lead.preferredTime}`);
    lines.push(`Visitor's time zone: ${lead.timezone || 'Not provided'}`, '');
  }

  lines.push(`Name: ${lead.name}`);
  lines.push(`Email: ${lead.email}`);
  if (lead.organization) lines.push(`Organization: ${lead.organization}`);
  if (lead.organizationType) lines.push(`Organization type: ${lead.organizationType}`);
  if (lead.role) lines.push(`Role: ${lead.role}`);
  if (lead.country) lines.push(`Country: ${lead.country}`);
  if (lead.message) {
    lines.push('', lead.kind === 'waitlist' ? 'Expectations:' : lead.kind === 'demo_request' ? 'Notes:' : 'Message:', lead.message);
  }
  lines.push('', '---', `Source: ${lead.source || 'unknown'}`, `Received: ${now.toISOString()}`, `Lead ID: ${leadId}`);

  return {
    to,
    from,
    fromName: 'QualiTracker website',
    replyTo: lead.email,
    subject: `[QualiTracker] ${label} — ${who}`,
    text: lines.join('\n'),
  };
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

/** RFC 2047 encoded-word, so non-ASCII names ("Zuhura Mwänga") survive in headers. */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`;
}

/** Builds the base64url RFC 2822 message the Gmail API expects. Header values must already be single-line. */
export function buildRawMessage(mail: OutboundMail): string {
  const headers = [
    `From: ${encodeHeader(mail.fromName)} <${mail.from}>`,
    `To: ${mail.to}`,
    `Reply-To: ${mail.replyTo}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];
  for (const h of headers) {
    if (/[\r\n]/.test(h)) throw new Error('Refusing to send: header contains a line break');
  }
  const body = (b64(mail.text).match(/.{1,76}/g) ?? []).join('\r\n');
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}\r\n`, 'utf8').toString('base64url');
}

export interface Identity {
  /** Email of the service account this function runs as. */
  serviceAccount: string;
  /** Short-lived Google access token for that service account. */
  accessToken: string;
}

type FetchFn = typeof fetch;

/** Reads the runtime identity from Application Default Credentials (the Cloud Run service account). */
async function adcIdentity(): Promise<Identity> {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const { client_email } = await auth.getCredentials();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!client_email || !token) throw new Error('No service-account identity available');
  return { serviceAccount: client_email, accessToken: token };
}

/**
 * Sends through the Gmail API as `sender` using Workspace domain-wide delegation, without any
 * key file: the function's own service account asks IAM to sign a delegation JWT for itself,
 * then exchanges that for a Gmail access token. Needs (a) roles/iam.serviceAccountTokenCreator
 * on itself and (b) the service account's client ID authorized in the Workspace admin console
 * for the gmail.send scope only. See docs/website/23_GCP_SETUP_RUNBOOK.md.
 */
export function createGmailMailer(
  sender: string,
  deps: { identity?: () => Promise<Identity>; fetchFn?: FetchFn; nowSeconds?: () => number } = {},
): Mailer {
  const identity = deps.identity ?? adcIdentity;
  const fetchFn = deps.fetchFn ?? fetch;
  const nowSeconds = deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  let cached: { token: string; expiresAt: number } | null = null;

  async function gmailToken(): Promise<string> {
    if (cached && cached.expiresAt - 60 > nowSeconds()) return cached.token;
    const { serviceAccount, accessToken } = await identity();
    const iat = nowSeconds();
    const signRes = await fetchFn(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:signJwt`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: JSON.stringify({
            iss: serviceAccount,
            sub: sender,
            scope: 'https://www.googleapis.com/auth/gmail.send',
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp: iat + 3600,
          }),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!signRes.ok) throw new Error(`signJwt failed: HTTP ${signRes.status}`);
    const { signedJwt } = (await signRes.json()) as { signedJwt?: string };
    if (!signedJwt) throw new Error('signJwt returned no JWT');

    const tokenRes = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt }),
      signal: AbortSignal.timeout(10_000),
    });
    // 4xx here almost always means domain-wide delegation is not authorized for this scope/user.
    if (!tokenRes.ok) throw new Error(`Gmail token exchange failed: HTTP ${tokenRes.status}`);
    const { access_token, expires_in } = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!access_token) throw new Error('Token exchange returned no access token');
    cached = { token: access_token, expiresAt: nowSeconds() + (expires_in ?? 3600) };
    return access_token;
  }

  return {
    async send(mail) {
      const token = await gmailToken();
      const res = await fetchFn('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: buildRawMessage(mail) }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Gmail send failed: HTTP ${res.status}`);
    },
  };
}
