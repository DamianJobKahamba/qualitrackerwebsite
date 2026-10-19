import { composeLeadEmail, type Mailer } from './mail.ts';
import { checkRate, hashKey, DEFAULT_LIMITS, type Counter, type Limits } from './ratelimit.ts';
import type { LeadStore } from './store.ts';
import { validateLead } from './validate.ts';

export interface Config {
  /** Exact origins allowed to call this endpoint from a browser. */
  allowedOrigins: string[];
  /** Optional extra pattern, used for Firebase Hosting preview channels whose URLs change. */
  allowedOriginPattern: RegExp | null;
  mailTo: string;
  mailSender: string;
  hashSalt: string;
  retentionDays: number;
  noticeVersion: string;
  limits: Limits;
  /** Upper bound for each database call, so a slow Firestore becomes a fast 500 (the browser then falls back). */
  storeTimeoutMs: number;
}

export interface Deps {
  store: LeadStore & Counter;
  mailer: Mailer;
  config: Config;
  now: () => Date;
  log: (severity: 'INFO' | 'WARNING' | 'ERROR', message: string, fields?: Record<string, unknown>) => void;
}

// Structural subsets of the Express request/response used by Cloud Run functions, so tests
// need no HTTP server.
export interface HttpReq {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  ip?: string;
}
export interface HttpRes {
  status(code: number): HttpRes;
  set(name: string, value: string): HttpRes;
  json(body: unknown): unknown;
  end(): unknown;
}

const MAX_BODY_CHARS = 20_000;

function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function header(req: HttpReq, name: string): string {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

/**
 * Client IP for rate limiting. Cloud Run appends the connecting address to X-Forwarded-For, so the
 * LAST entry is the one Google saw; earlier entries are client-supplied and must not be trusted.
 */
export function clientIp(req: HttpReq): string {
  const forwarded = header(req, 'x-forwarded-for');
  const last = forwarded.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return last || req.ip || 'unknown';
}

export function originAllowed(origin: string, config: Config): boolean {
  if (!origin) return false;
  return config.allowedOrigins.includes(origin) || (config.allowedOriginPattern?.test(origin) ?? false);
}

export function createHandler(deps: Deps) {
  const { store, mailer, config, now, log } = deps;

  return async function submitLead(req: HttpReq, res: HttpRes): Promise<void> {
    const origin = header(req, 'origin');
    const allowed = originAllowed(origin, config);
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Origin');
    if (allowed) {
      res.set('Access-Control-Allow-Origin', origin);
    }

    if (req.method === 'OPTIONS') {
      if (!allowed) { res.status(403).end(); return; }
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') { res.set('Allow', 'POST, OPTIONS'); res.status(405).json({ ok: false, error: 'METHOD' }); return; }
    // Browsers always send Origin on a cross-origin POST. Requiring an allowed one rejects
    // casual scripts and other websites; it is a speed bump, not a security boundary.
    if (!allowed) { res.status(403).json({ ok: false, error: 'FORBIDDEN' }); return; }

    if (!header(req, 'content-type').toLowerCase().startsWith('application/json')) {
      res.status(415).json({ ok: false, error: 'CONTENT_TYPE' });
      return;
    }
    const declared = Number(header(req, 'content-length'));
    let serialized = '';
    try { serialized = JSON.stringify(req.body ?? null); } catch { /* unserializable body */ }
    if ((Number.isFinite(declared) && declared > MAX_BODY_CHARS) || serialized.length > MAX_BODY_CHARS) {
      res.status(413).json({ ok: false, error: 'TOO_LARGE' });
      return;
    }

    const body = req.body as Record<string, unknown> | null;
    // Honeypot: a hidden field real visitors never fill. Pretend success, store nothing.
    if (body && typeof body.website === 'string' && body.website.trim()) {
      log('INFO', 'honeypot_hit');
      res.status(200).json({ ok: true });
      return;
    }

    const when = now();
    const result = validateLead(body, when);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error, field: result.field });
      return;
    }
    const { lead } = result;

    const ip = clientIp(req);
    let verdict;
    try {
      verdict = await withTimeout(
        checkRate(store, config.hashSalt, ip, lead.email, when, config.limits ?? DEFAULT_LIMITS),
        config.storeTimeoutMs,
        'rate limit check',
      );
    } catch (err) {
      // If the rate-limit store is unreachable the lead store will be too; fail the request.
      log('ERROR', 'rate_limit_failed', { error: String(err) });
      res.status(500).json({ ok: false, error: 'SERVER' });
      return;
    }
    if (!verdict.allowed) {
      log('WARNING', 'rate_limited', { reason: verdict.reason, kind: lead.kind });
      res.set('Retry-After', verdict.reason === 'ip' ? '3600' : '86400');
      res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
      return;
    }

    // 1) Persist first: the stored record is the source of truth, so a mail outage cannot lose a lead.
    let leadId: string;
    try {
      leadId = await withTimeout(
        store.save(
          { ...lead, consentNotice: config.noticeVersion, ipHash: hashKey(config.hashSalt, 'ip', ip) },
          when,
          config.retentionDays,
        ),
        config.storeTimeoutMs,
        'lead save',
      );
    } catch (err) {
      log('ERROR', 'lead_store_failed', { kind: lead.kind, error: String(err) });
      res.status(500).json({ ok: false, error: 'SERVER' });
      return;
    }

    // 2) Then notify the team. A failure here is logged loudly (alert on this message) and the
    //    record is flagged, but the visitor still gets success because their lead is safe.
    try {
      await mailer.send(composeLeadEmail(lead, leadId, when, config.mailTo, config.mailSender));
      await store.markEmail(leadId, 'sent').catch((e) => log('WARNING', 'mark_email_failed', { leadId, error: String(e) }));
    } catch (err) {
      log('ERROR', 'lead_email_failed', { leadId, kind: lead.kind, error: String(err) });
      await store.markEmail(leadId, 'failed', String(err).slice(0, 300)).catch(() => undefined);
    }

    log('INFO', 'lead_received', { leadId, kind: lead.kind });
    res.status(200).json({ ok: true });
  };
}
