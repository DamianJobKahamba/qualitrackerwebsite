// Server-side validation. The browser validates too (artifacts/qualitracker-website
// /src/lib/leads.ts) but a request can bypass the browser entirely, so every rule
// is enforced again here. Keep the two in step when a form changes.

export type LeadKind = 'waitlist' | 'talk_to_team' | 'demo_request';

export interface Lead {
  kind: LeadKind;
  name: string;
  email: string;
  organization: string;
  organizationType: string;
  role: string;
  country: string;
  message: string;
  preferredDate: string;
  backupDate: string;
  preferredTime: string;
  timezone: string;
  source: string;
}

export type ValidationResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: 'INVALID' | 'CONSENT_REQUIRED'; field?: string };

const KINDS: readonly string[] = ['waitlist', 'talk_to_team', 'demo_request'];
// Stricter than the browser's check on purpose: this value is placed in a Reply-To
// header, so it must be exactly one plain address (no commas, quotes, angle brackets).
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const MAX = {
  name: 120,
  email: 254,
  organization: 200,
  organizationType: 100,
  role: 120,
  country: 100,
  message: 4000,
  preferredTime: 60,
  timezone: 64,
  source: 60,
} as const;

/**
 * A string field: trimmed, control characters removed, length-capped by rejecting (not truncating).
 * Single-line fields also have newlines/tabs collapsed, because several of them end up in email
 * headers (subject, display name) where a newline would allow header injection.
 */
function text(value: unknown, max: number, multiline = false): string | null {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  let cleaned = value.replace(/\r\n?/g, '\n');
  cleaned = cleaned.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  cleaned = multiline ? cleaned.trim() : cleaned.replace(/[\n\t]+/g, ' ').trim();
  return cleaned.length > max ? null : cleaned;
}

/** True when `iso` is a real calendar date (rejects 2026-02-31, which a regex alone accepts). */
export function isRealDate(iso: string): boolean {
  if (!DATE_PATTERN.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Whole days from `now` (UTC midnight) to the ISO date; negative means in the past. */
function daysFromNow(iso: string, now: Date): number {
  const [y, m, d] = iso.split('-').map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS);
}

export function validateLead(body: unknown, now: Date = new Date()): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'INVALID' };
  const b = body as Record<string, unknown>;

  const kind = b.kind;
  if (typeof kind !== 'string' || !KINDS.includes(kind)) return { ok: false, error: 'INVALID', field: 'kind' };

  const fields = {
    name: text(b.firstName, MAX.name),
    email: text(b.email, MAX.email),
    organization: text(b.institution, MAX.organization),
    organizationType: text(b.organizationType, MAX.organizationType),
    role: text(b.role, MAX.role),
    country: text(b.country, MAX.country),
    message: text(b.message, MAX.message, true),
    preferredDate: text(b.preferredDate, 10),
    backupDate: text(b.backupDate, 10),
    preferredTime: text(b.preferredTime, MAX.preferredTime),
    timezone: text(b.timezone, MAX.timezone),
    source: text(b.source, MAX.source),
  };
  for (const [field, value] of Object.entries(fields)) {
    if (value === null) return { ok: false, error: 'INVALID', field };
  }
  // text() returned non-null for every field above.
  const f = fields as Record<keyof typeof fields, string>;

  if (!f.email || !EMAIL_PATTERN.test(f.email)) return { ok: false, error: 'INVALID', field: 'email' };

  if (kind === 'waitlist') {
    for (const field of ['name', 'organization', 'organizationType', 'country', 'role', 'message'] as const) {
      if (!f[field]) return { ok: false, error: 'INVALID', field };
    }
  } else if (kind === 'talk_to_team') {
    for (const field of ['name', 'message'] as const) {
      if (!f[field]) return { ok: false, error: 'INVALID', field };
    }
  } else {
    for (const field of ['name', 'organization', 'preferredDate', 'preferredTime'] as const) {
      if (!f[field]) return { ok: false, error: 'INVALID', field };
    }
    // Dates must be real, from today onward (one day of slack for time zones), within a year.
    for (const field of ['preferredDate', 'backupDate'] as const) {
      if (!f[field]) continue;
      if (!isRealDate(f[field])) return { ok: false, error: 'INVALID', field };
      const days = daysFromNow(f[field], now);
      if (days < -1 || days > 366) return { ok: false, error: 'INVALID', field };
    }
  }

  if (b.consent !== true) return { ok: false, error: 'CONSENT_REQUIRED' };

  return { ok: true, lead: { kind: kind as LeadKind, ...f } };
}
