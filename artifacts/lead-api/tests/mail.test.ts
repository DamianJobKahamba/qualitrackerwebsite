import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRawMessage, composeLeadEmail, createGmailMailer, type OutboundMail } from '../src/mail.ts';
import { NOW } from './helpers.ts';
import { validateLead } from '../src/validate.ts';
import { waitlist } from './helpers.ts';

const mail: OutboundMail = {
  to: 'info@qualitracker.com', from: 'info@qualitracker.com', fromName: 'QualiTracker website',
  replyTo: 'v@example.org', subject: '[QualiTracker] Waitlist signup — Zuhura Mwänga', text: 'Hello\nWörld',
};
const decode = (raw: string) => Buffer.from(raw, 'base64url').toString('utf8');

test('raw message has the right headers and a base64 UTF-8 body', () => {
  const msg = decode(buildRawMessage(mail));
  const [head, body] = msg.split('\r\n\r\n');
  assert.match(head, /^From: QualiTracker website <info@qualitracker.com>$/m);
  assert.match(head, /^To: info@qualitracker.com$/m);
  assert.match(head, /^Reply-To: v@example.org$/m);
  assert.match(head, /^Subject: =\?UTF-8\?B\?/m); // non-ASCII subject is RFC 2047 encoded
  assert.match(head, /Content-Transfer-Encoding: base64/);
  assert.equal(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8'), 'Hello\nWörld');
});

test('a line break in any header value is refused rather than sent', () => {
  assert.throws(() => buildRawMessage({ ...mail, replyTo: 'a@b.org\r\nBcc: x@evil.example' }), /line break/);
  // A newline in the subject is base64-encoded into a MIME encoded-word, so it cannot start a new header.
  const head = decode(buildRawMessage({ ...mail, subject: 'hi\nBcc: x@evil.example' })).split('\r\n\r\n')[0];
  assert.ok(!/^Bcc:/mi.test(head));
});

test('composeLeadEmail puts the visitor in Reply-To and the lead id in the body', () => {
  const r = validateLead(waitlist, NOW);
  assert.ok(r.ok);
  if (!r.ok) return;
  const m = composeLeadEmail(r.lead, 'abc123', NOW, 'info@qualitracker.com', 'info@qualitracker.com');
  assert.equal(m.replyTo, 'zuhura@example.org');
  assert.match(m.text, /Lead ID: abc123/);
  assert.match(m.text, /Expectations:\nBetter QMS/);
});

test('Gmail mailer: signs a delegation JWT for the sender, exchanges it, sends, and caches the token', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.includes(':signJwt')) return Response.json({ signedJwt: 'signed.jwt.value' });
    if (url.includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'gmail-token', expires_in: 3600 });
    return Response.json({ id: 'msg1' });
  }) as unknown as typeof fetch;
  const mailer = createGmailMailer('info@qualitracker.com', {
    identity: async () => ({ serviceAccount: 'lead-api@proj.iam.gserviceaccount.com', accessToken: 'adc-token' }),
    fetchFn, nowSeconds: () => 1_000_000,
  });

  await mailer.send(mail);
  await mailer.send(mail);

  const sign = calls.find((c) => c.url.includes(':signJwt'))!;
  assert.match(sign.url, /serviceAccounts\/lead-api%40proj\.iam\.gserviceaccount\.com:signJwt/);
  assert.equal((sign.init.headers as Record<string, string>).Authorization, 'Bearer adc-token');
  const claims = JSON.parse(JSON.parse(sign.init.body as string).payload);
  assert.equal(claims.sub, 'info@qualitracker.com');
  assert.equal(claims.iss, 'lead-api@proj.iam.gserviceaccount.com');
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/gmail.send'); // send-only, nothing broader
  const exchange = calls.find((c) => c.url.includes('oauth2.googleapis.com'))!;
  assert.match(String(exchange.init.body), /assertion=signed\.jwt\.value/);
  const sends = calls.filter((c) => c.url.includes('gmail.googleapis.com'));
  assert.equal(sends.length, 2);
  assert.equal(calls.filter((c) => c.url.includes(':signJwt')).length, 1, 'token reused for the second send');
  assert.equal((sends[0].init.headers as Record<string, string>).Authorization, 'Bearer gmail-token');
});

test('Gmail mailer: delegation not authorized (token exchange 401) surfaces as an error', async () => {
  const fetchFn = (async (url: string) =>
    url.includes(':signJwt') ? Response.json({ signedJwt: 'j' }) : new Response('unauthorized_client', { status: 401 })) as unknown as typeof fetch;
  const mailer = createGmailMailer('info@qualitracker.com', {
    identity: async () => ({ serviceAccount: 'sa@p.iam.gserviceaccount.com', accessToken: 't' }), fetchFn,
  });
  await assert.rejects(mailer.send(mail), /token exchange failed: HTTP 401/);
});
