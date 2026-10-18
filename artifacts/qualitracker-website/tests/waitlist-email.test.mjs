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
