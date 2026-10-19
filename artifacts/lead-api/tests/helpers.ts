import type { Config, Deps, HttpReq, HttpRes } from '../src/handler.ts';
import type { OutboundMail } from '../src/mail.ts';
import type { LeadRecord } from '../src/store.ts';

export const NOW = new Date('2026-11-02T10:00:00Z');

export const config: Config = {
  allowedOrigins: ['https://qualitracker.com'],
  allowedOriginPattern: /^https:\/\/peppy-house-510317-n5--[a-z0-9-]+\.web\.app$/,
  mailTo: 'info@qualitracker.com',
  mailSender: 'info@qualitracker.com',
  hashSalt: 'test-salt-test-salt-test-salt',
  retentionDays: 730,
  noticeVersion: 'test-notice',
  limits: { perIpPerHour: 5, perEmailPerDay: 3 },
  storeTimeoutMs: 50,
};

export function fakes(overrides: { mailFails?: boolean; storeFails?: boolean; storeHangs?: boolean } = {}) {
  const saved: Array<{ id: string; record: LeadRecord; retentionDays: number }> = [];
  const emailStatus: Record<string, string> = {};
  const sent: OutboundMail[] = [];
  const logs: Array<{ severity: string; message: string; fields?: Record<string, unknown> }> = [];
  const counters = new Map<string, number>();

  const deps: Deps = {
    config,
    now: () => NOW,
    log: (severity, message, fields) => { logs.push({ severity, message, fields }); },
    store: {
      async save(record, _now, retentionDays) {
        if (overrides.storeFails) throw new Error('firestore down');
        if (overrides.storeHangs) await new Promise(() => undefined);
        const id = `lead${saved.length + 1}`;
        saved.push({ id, record, retentionDays });
        return id;
      },
      async markEmail(id, status) { emailStatus[id] = status; },
      async hit(id) { const n = (counters.get(id) ?? 0) + 1; counters.set(id, n); return n; },
    },
    mailer: {
      async send(mail) {
        if (overrides.mailFails) throw new Error('gmail 403');
        sent.push(mail);
      },
    },
  };
  return { deps, saved, sent, logs, emailStatus, counters };
}

export interface Captured { status: number; headers: Record<string, string>; body: unknown; ended: boolean }

export function call(
  handler: (req: HttpReq, res: HttpRes) => Promise<void>,
  req: Partial<HttpReq> & { body?: unknown },
): Promise<Captured> {
  const out: Captured = { status: 200, headers: {}, body: undefined, ended: false };
  const res: HttpRes = {
    status(code) { out.status = code; return res; },
    set(name, value) { out.headers[name.toLowerCase()] = value; return res; },
    json(body) { out.body = body; return res; },
    end() { out.ended = true; return res; },
  };
  return handler({ method: 'POST', headers: {}, ...req }, res).then(() => out);
}

export const goodHeaders = {
  origin: 'https://qualitracker.com',
  'content-type': 'application/json',
  'x-forwarded-for': '1.2.3.4',
};

export const waitlist = {
  kind: 'waitlist', firstName: 'Zuhura Mwänga', email: 'zuhura@example.org', institution: 'Mbeya Regional Lab',
  organizationType: 'Public laboratory', country: 'Tanzania', role: 'Quality manager', message: 'Better QMS', source: 'waitlist-page', consent: true,
};
export const demo = {
  kind: 'demo_request', firstName: 'Jane', email: 'jane@example.org', institution: 'Test Lab',
  preferredDate: '2026-11-10', backupDate: '2026-11-12', preferredTime: 'Morning (09:00–12:00)', timezone: 'Africa/Dar_es_Salaam',
  message: 'Two attendees', source: 'book-demo-page', consent: true,
};
export const talk = { kind: 'talk_to_team', firstName: 'Sam', email: 'sam@example.org', message: 'Inquiry: General inquiry\n\nHello', source: 'talk-to-team-page', consent: true };
