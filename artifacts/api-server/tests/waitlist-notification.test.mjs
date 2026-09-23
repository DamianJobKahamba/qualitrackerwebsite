import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWaitlistNotification, sendWaitlistNotification } from '../src/lib/waitlist-notification.ts';
const lead = { id: 'test-id', email: 'jane+lab@example.org', firstName: 'Jane <Doe>', institution: 'Lab & Co', organizationType: 'Public', country: 'Tanzania', role: 'Manager', message: '<script>alert(1)</script>\nSecond line', source: 'waitlist-page', createdAt: new Date('2026-09-23T04:00:00Z') };
const env = { RESEND_API_KEY: 'test-key', EMAIL_FROM: 'website@qualitracker.com', WAITLIST_NOTIFICATION_EMAIL: 'info@qualitracker.com, team@example.org' };
test('all fields, safe HTML, clickable email and reply-to', () => {
  const msg = formatWaitlistNotification(lead);
  assert.equal(msg.reply_to, lead.email);
  assert.match(msg.html, /mailto:jane%2Blab@example.org/);
  assert.ok(!msg.html.includes('<script>'));
  assert.match(msg.html, /&lt;script&gt;/);
  assert.match(msg.html, /<br>Second line/);
  for (const value of [lead.email, lead.firstName, lead.institution, lead.organizationType, lead.country, lead.role, lead.message, lead.createdAt.toISOString()]) assert.ok(msg.text.includes(value));
  assert.match(msg.text, /Status: New/);
});
test('unconfigured delivery skips network', async () => {
  assert.equal(await sendWaitlistNotification(lead, {}, async () => { throw new Error('must not send'); }), 'not_configured');
});
test('internal recipients, reply-to, timeout and stable idempotency key', async () => {
  const result = await sendWaitlistNotification(lead, env, async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, ['info@qualitracker.com', 'team@example.org']);
    assert.equal(body.reply_to, lead.email);
    assert.equal(options.headers['Idempotency-Key'], 'waitlist/test-id');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('{}', { status: 200 });
  });
  assert.equal(result, 'sent');
});
test('provider errors exclude sensitive response bodies', async () => {
  await assert.rejects(sendWaitlistNotification(lead, env, async () => new Response('sensitive', { status: 403 })), { message: 'Waitlist email provider returned HTTP 403' });
});
test('network failure reaches route error handler', async () => {
  await assert.rejects(sendWaitlistNotification(lead, env, async () => { throw new Error('network unavailable'); }), /network unavailable/);
});
