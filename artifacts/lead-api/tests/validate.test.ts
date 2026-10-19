import test from 'node:test';
import assert from 'node:assert/strict';
import { isRealDate, validateLead } from '../src/validate.ts';
import { demo, NOW, talk, waitlist } from './helpers.ts';

const bad = (body: unknown) => {
  const r = validateLead(body, NOW);
  assert.equal(r.ok, false);
  return r as Extract<typeof r, { ok: false }>;
};

test('accepts the three valid payloads', () => {
  for (const body of [waitlist, demo, talk]) assert.equal(validateLead(body, NOW).ok, true);
});

test('rejects non-objects, unknown kinds, bad emails', () => {
  for (const body of [null, 'x', [], {}, { ...waitlist, kind: 'newsletter' }]) bad(body);
  for (const email of ['', 'no-at', 'a@b', 'a b@c.org', 'one@x.org,two@y.org', '"q"@x.org', 'a@b.org>']) {
    assert.equal(bad({ ...waitlist, email }).field, 'email', email);
  }
});

test('waitlist requires every field; talk requires name+message; demo requires date and window', () => {
  for (const f of ['firstName', 'institution', 'organizationType', 'country', 'role', 'message']) {
    assert.equal(bad({ ...waitlist, [f]: '  ' }).ok, false, f);
  }
  assert.equal(bad({ ...talk, message: '' }).ok, false);
  assert.equal(bad({ ...demo, preferredTime: '' }).ok, false);
  assert.equal(bad({ ...demo, preferredDate: '' }).ok, false);
});

test('demo dates must be real, not long past, and within a year', () => {
  assert.equal(isRealDate('2026-02-28'), true);
  assert.equal(isRealDate('2026-02-31'), false);
  assert.equal(isRealDate('next tuesday'), false);
  assert.equal(bad({ ...demo, preferredDate: '2026-02-31' }).field, 'preferredDate');
  assert.equal(bad({ ...demo, preferredDate: '2026-10-01' }).field, 'preferredDate');
  assert.equal(bad({ ...demo, backupDate: '2028-01-01' }).field, 'backupDate');
  assert.equal(validateLead({ ...demo, preferredDate: '2026-11-01' }, NOW).ok, true); // yesterday: time-zone slack
});

test('fields over their length cap are rejected, not truncated', () => {
  assert.equal(bad({ ...waitlist, firstName: 'x'.repeat(121) }).field, 'name');
  assert.equal(bad({ ...waitlist, message: 'x'.repeat(4001) }).field, 'message');
});

test('non-string field types are rejected', () => {
  assert.equal(bad({ ...waitlist, institution: { $ne: 1 } }).field, 'organization');
  assert.equal(bad({ ...waitlist, role: ['a'] }).field, 'role');
});

test('consent must be exactly true', () => {
  for (const consent of [false, 'true', 1, undefined]) {
    assert.equal(bad({ ...waitlist, consent }).error, 'CONSENT_REQUIRED');
  }
});

test('newlines in single-line fields are flattened (header injection), kept in the message', () => {
  const r = validateLead({ ...waitlist, firstName: 'Eve\r\nBcc: attacker@evil.example', message: 'line1\r\nline2' }, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(!/[\r\n]/.test(r.lead.name));
    assert.equal(r.lead.message, 'line1\nline2');
  }
});
