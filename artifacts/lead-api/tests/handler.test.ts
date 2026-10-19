import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/handler.ts';
import { call, demo, fakes, goodHeaders, talk, waitlist } from './helpers.ts';

const post = (h: ReturnType<typeof createHandler>, body: unknown, headers: Record<string, string> = goodHeaders) =>
  call(h, { method: 'POST', headers, body });

test('valid waitlist lead is stored, emailed to the team with Reply-To = visitor, and succeeds', async () => {
  const f = fakes();
  const r = await post(createHandler(f.deps), waitlist);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
  assert.equal(f.saved.length, 1);
  assert.equal(f.saved[0].record.email, 'zuhura@example.org');
  assert.equal(f.saved[0].record.consentNotice, 'test-notice');
  assert.equal(f.saved[0].retentionDays, 730);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].to, 'info@qualitracker.com');
  assert.equal(f.sent[0].replyTo, 'zuhura@example.org');
  assert.match(f.sent[0].subject, /Waitlist signup — Zuhura Mwänga \(Mbeya Regional Lab\)/);
  assert.equal(f.emailStatus.lead1, 'sent');
  assert.equal(r.headers['access-control-allow-origin'], 'https://qualitracker.com');
});

test('stored record holds a hashed IP, never the raw one, and logs hold no personal data', async () => {
  const f = fakes();
  await post(createHandler(f.deps), waitlist);
  const rec = JSON.stringify(f.saved[0].record);
  assert.ok(!rec.includes('1.2.3.4'));
  assert.match(f.saved[0].record.ipHash, /^[0-9a-f]{32}$/);
  const logText = JSON.stringify(f.logs);
  assert.ok(!logText.includes('zuhura') && !logText.includes('Mbeya') && !logText.includes('1.2.3.4'));
});

test('demo request email says it is not scheduled and carries dates, window and time zone', async () => {
  const f = fakes();
  await post(createHandler(f.deps), demo);
  const text = f.sent[0].text;
  assert.match(text, /DEMO REQUEST — not yet scheduled/);
  assert.match(text, /Preferred date: Tue, 10 Nov 2026 \(2026-11-10\)/);
  assert.match(text, /Backup date: Thu, 12 Nov 2026/);
  assert.match(text, /Africa\/Dar_es_Salaam/);
  assert.match(f.sent[0].subject, /Demo request — Jane \(Test Lab\)/);
});

test('talk_to_team needs only name, email, message and consent', async () => {
  const f = fakes();
  const r = await post(createHandler(f.deps), talk);
  assert.equal(r.status, 200);
  assert.match(f.sent[0].subject, /Inquiry — Sam/);
});

test('a mail outage still succeeds for the visitor, flags the record and logs an ERROR to alert on', async () => {
  const f = fakes({ mailFails: true });
  const r = await post(createHandler(f.deps), waitlist);
  assert.equal(r.status, 200);
  assert.equal(f.saved.length, 1);
  assert.equal(f.emailStatus.lead1, 'failed');
  assert.ok(f.logs.some((l) => l.severity === 'ERROR' && l.message === 'lead_email_failed'));
});

test('if the lead cannot be stored the visitor gets a 500 and no email is sent', async () => {
  const f = fakes({ storeFails: true });
  const r = await post(createHandler(f.deps), waitlist);
  assert.equal(r.status, 500);
  assert.equal(f.sent.length, 0);
  assert.ok(f.logs.some((l) => l.message === 'lead_store_failed'));
});

test('honeypot gets a fake success and stores/sends nothing', async () => {
  const f = fakes();
  const r = await post(createHandler(f.deps), { ...waitlist, website: 'http://spam.example' });
  assert.equal(r.status, 200);
  assert.equal(f.saved.length, 0);
  assert.equal(f.sent.length, 0);
});

test('missing consent is rejected', async () => {
  const f = fakes();
  const r = await post(createHandler(f.deps), { ...waitlist, consent: false });
  assert.equal(r.status, 400);
  assert.equal((r.body as { error: string }).error, 'CONSENT_REQUIRED');
  assert.equal(f.saved.length, 0);
});

test('unknown origin is refused (POST and preflight); missing origin is refused', async () => {
  const f = fakes();
  const h = createHandler(f.deps);
  assert.equal((await post(h, waitlist, { ...goodHeaders, origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(h, waitlist, { 'content-type': 'application/json' })).status, 403);
  const pre = await call(h, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
  assert.equal(pre.status, 403);
  assert.equal(pre.headers['access-control-allow-origin'], undefined);
  assert.equal(f.saved.length, 0);
});

test('preflight from the site and from a Firebase preview channel succeeds', async () => {
  const h = createHandler(fakes().deps);
  const ok = await call(h, { method: 'OPTIONS', headers: { origin: 'https://qualitracker.com' } });
  assert.equal(ok.status, 204);
  assert.match(ok.headers['access-control-allow-headers'], /Content-Type/);
  const preview = await call(h, { method: 'OPTIONS', headers: { origin: 'https://qualitracker-website-e6c53--dev-ab12cd34.web.app' } });
  assert.equal(preview.status, 204);
  const lookalike = await call(h, { method: 'OPTIONS', headers: { origin: 'https://qualitracker-website-e6c53--dev.web.app.evil.example' } });
  assert.equal(lookalike.status, 403);
});

test('wrong method, wrong content type and oversized bodies are rejected', async () => {
  const h = createHandler(fakes().deps);
  assert.equal((await call(h, { method: 'GET', headers: goodHeaders })).status, 405);
  assert.equal((await post(h, waitlist, { ...goodHeaders, 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post(h, { ...waitlist, message: 'x'.repeat(25_000) })).status, 413);
});

test('rate limit: the 6th request from one IP in an hour gets 429 and is not stored', async () => {
  const f = fakes();
  const h = createHandler(f.deps);
  for (let i = 0; i < 5; i++) {
    const r = await post(h, { ...waitlist, email: `user${i}@example.org` });
    assert.equal(r.status, 200, `request ${i + 1}`);
  }
  const blocked = await post(h, { ...waitlist, email: 'user6@example.org' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['retry-after'], '3600');
  assert.equal(f.saved.length, 5);
});

test('rate limit: the same email 4 times in a day from different IPs gets 429', async () => {
  const f = fakes();
  const h = createHandler(f.deps);
  for (let i = 0; i < 3; i++) {
    assert.equal((await post(h, waitlist, { ...goodHeaders, 'x-forwarded-for': `9.9.9.${i}` })).status, 200);
  }
  assert.equal((await post(h, waitlist, { ...goodHeaders, 'x-forwarded-for': '9.9.9.9' })).status, 429);
});

test('a spoofed leading X-Forwarded-For entry cannot dodge the limit (the last entry counts)', async () => {
  const f = fakes();
  const h = createHandler(f.deps);
  for (let i = 0; i < 5; i++) {
    await post(h, { ...waitlist, email: `a${i}@example.org` }, { ...goodHeaders, 'x-forwarded-for': `10.0.0.${i}, 1.2.3.4` });
  }
  const r = await post(h, { ...waitlist, email: 'a9@example.org' }, { ...goodHeaders, 'x-forwarded-for': '10.0.0.99, 1.2.3.4' });
  assert.equal(r.status, 429);
});

test('a hanging database fails fast with 500 (so the browser can fall back) instead of hanging', async () => {
  const f = fakes({ storeHangs: true });
  const started = Date.now();
  const r = await post(createHandler(f.deps), waitlist);
  assert.equal(r.status, 500);
  assert.ok(Date.now() - started < 1000);
  assert.equal(f.sent.length, 0);
  assert.ok(f.logs.some((l) => l.message === 'lead_store_failed' && String(l.fields?.error).includes('timed out')));
});
