# Frontend waitlist email setup

The waitlist now posts directly to EmailJS from the browser. No API server or PostgreSQL is used for waitlist submissions. Other form kinds retain their existing API behavior. Success means EmailJS accepted the request, not a database insert or guaranteed inbox delivery. Duplicate detection is not provided.

Service: service_h8tr7y8
Template: template_v13pvti
Public key is in src/lib/leads.ts and was transcribed from the supplied screenshot.

## Required EmailJS template settings

The template is currently named Auto-Reply in the screenshot; its name can be changed to QualiTracker Waitlist Notification. Ensure it is configured as an internal notification:
- To Email: info@qualitracker.com (fixed)
- From Name: QualiTracker Website
- From Email: use the connected service's default email
- Reply-To: {{work_email}}
- Subject: New QualiTracker Waitlist Submission — {{full_name}}
- CC: paste the user-provided recipient list directly into the EmailJS dashboard. Keep personal recipient addresses out of this repository.

These dashboard settings cannot be changed merely by committing GitHub code. They must be saved in EmailJS. Do not use visitor-controlled recipient variables.

## HTML body

```html
<div style="font-family:Arial,sans-serif;color:#1A3A4A;max-width:640px">
<h2 style="color:#025561">New QualiTracker Waitlist Submission</h2>
<p><strong>Full name:</strong><br>{{full_name}}</p>
<p><strong>Work email:</strong><br><a href="mailto:{{work_email}}">{{work_email}}</a></p>
<p><strong>Laboratory / organization:</strong><br>{{organization}}</p>
<p><strong>Organization type:</strong><br>{{organization_type}}</p>
<p><strong>Country:</strong><br>{{country}}</p>
<p><strong>Your role:</strong><br>{{role}}</p>
<p><strong>What are your expectations for the product?</strong></p>
<div style="white-space:pre-wrap">{{expectations}}</div>
<hr><h3>Submission Details</h3>
<p><strong>Submitted (UTC):</strong> {{submitted_at}}</p>
<p><strong>Source:</strong> QualiTracker Waitlist Page</p>
</div>
```

The API fields match https://www.emailjs.com/docs/rest-api/send/.
No private key or Gmail password belongs in frontend code.

## Verification

Run node --test artifacts/qualitracker-website/tests/waitlist-email.test.mjs on Node 22.18+ or 24. Tests mock the service and do not send mail.

After merging/deploying and saving the template settings, submit a test from the actual website and check the recipient inboxes and Reply-To. Live delivery and dashboard configuration have not been verified.
