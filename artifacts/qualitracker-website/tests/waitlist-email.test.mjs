import test from 'node:test';
import assert from 'node:assert/strict';
import { submitLead } from '../src/lib/leads.ts';
const lead = {kind:'waitlist',firstName:'Jane',email:'jane@example.org',institution:'Lab',organizationType:'Public',country:'Tanzania',role:'Manager',message:'Better QMS',source:'waitlist-page',consent:true};
test('waitlist goes directly to EmailJS with every template value', async () => {
 const original = globalThis.fetch;
 try {
 globalThis.fetch = async (url, options) => {
 assert.equal(url,'https://api.emailjs.com/api/v1.0/email/send');
 const body=JSON.parse(options.body);
 assert.equal(body.service_id,'service_h8tr7y8');
 assert.equal(body.template_id,'template_v13pvti');
 assert.deepEqual(Object.keys(body.template_params),['full_name','work_email','organization','organization_type','country','role','expectations','submitted_at']);
 assert.equal(body.template_params.expectations,lead.message);
 assert.equal(body.template_params.work_email,lead.email);
 return new Response('OK');
 };
 await submitLead(lead);
 } finally { globalThis.fetch=original; }
});
test('email rejection does not show success', async () => {
 const original=globalThis.fetch;
 try {
 globalThis.fetch=async()=>new Response('error',{status:400});
 await assert.rejects(submitLead(lead),/SUBMIT_FAILED/);
 } finally {globalThis.fetch=original;}
});
test('honeypot and invalid inputs do not send email', async () => {
 const original=globalThis.fetch;
 try {
 globalThis.fetch=async()=>{throw new Error('unexpected send');};
 await submitLead({...lead,website:'spam'});
 await assert.rejects(submitLead({...lead,message:' '}),/INVALID_WAITLIST/);
 } finally {globalThis.fetch=original;}
});

test('talk_to_team goes through EmailJS (never /api/leads) with the inquiry in expectations', async () => {
  const original = globalThis.fetch;
  try {
    const calls = [];
    globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('OK'); };
    await submitLead({ kind: 'talk_to_team', firstName: 'Jane', email: 'jane@example.org', message: 'Inquiry: General inquiry\n\nHello', source: 'talk-to-team-page', consent: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
    assert.match(calls[0].body.template_params.expectations, /Hello/);
    assert.equal(calls[0].body.template_params.organization, 'Not provided');
  } finally { globalThis.fetch = original; }
});

test('submissions without consent are rejected before any request', async () => {
  const original = globalThis.fetch;
  try {
    let called = false;
    globalThis.fetch = async () => { called = true; return new Response('OK'); };
    await assert.rejects(submitLead({ ...lead, consent: false }), /CONSENT_REQUIRED/);
    await assert.rejects(submitLead({ kind: 'talk_to_team', firstName: 'J', email: 'j@example.org', message: 'hi', source: 'x', consent: false }), /CONSENT_REQUIRED/);
    assert.equal(called, false);
  } finally { globalThis.fetch = original; }
});

test('demo_request goes through EmailJS with date, backup, window and time zone in the body', async () => {
  const original = globalThis.fetch;
  try {
    const calls = [];
    globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('OK'); };
    await submitLead({ kind: 'demo_request', firstName: 'Jane', email: 'jane@example.org', institution: 'Test Lab', preferredDate: '2030-01-15', backupDate: '2030-01-17', preferredTime: 'Morning (09:00–12:00)', timezone: 'Africa/Dar_es_Salaam', message: 'Two attendees', source: 'book-demo-page', consent: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
    const p = calls[0].body.template_params;
    assert.match(p.expectations, /DEMO REQUEST/);
    assert.match(p.expectations, /Morning/);
    assert.match(p.expectations, /Africa\/Dar_es_Salaam/);
    assert.match(p.expectations, /Two attendees/);
    assert.equal(p.work_email, 'jane@example.org');
    assert.equal(p.organization_type, 'Demo request');
  } finally { globalThis.fetch = original; }
});

test('demo_request without date/time/consent or with a bad date is rejected before any request', async () => {
  const original = globalThis.fetch;
  try {
    let called = false;
    globalThis.fetch = async () => { called = true; return new Response('OK'); };
    const base = { kind: 'demo_request', firstName: 'J', email: 'j@example.org', institution: 'Lab', preferredDate: '2030-01-15', preferredTime: 'Morning (09:00–12:00)', source: 'x', consent: true };
    await assert.rejects(submitLead({ ...base, consent: false }), /CONSENT_REQUIRED/);
    await assert.rejects(submitLead({ ...base, preferredDate: '' }), /INVALID_DEMO_REQUEST/);
    await assert.rejects(submitLead({ ...base, preferredDate: 'next tuesday' }), /INVALID_DEMO_REQUEST/);
    await assert.rejects(submitLead({ ...base, preferredTime: '' }), /INVALID_DEMO_REQUEST/);
    assert.equal(called, false);
  } finally { globalThis.fetch = original; }
});
