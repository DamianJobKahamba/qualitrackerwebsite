# Waitlist email notifications

New waitlist leads are saved in PostgreSQL first, then an internal email is attempted through Resend. Other lead kinds and duplicate submissions do not trigger this notification. The visitor receives success after a saved submission even when the email is unconfigured, rejected, or times out (5 seconds). Failures are logged by lead ID. This is best-effort notification: there is no automatic retry queue or backfill; PostgreSQL remains the record of submissions.

## Backend settings

- WAITLIST_NOTIFICATION_EMAIL=info@qualitracker.com (comma-separated internal addresses supported)
- EMAIL_FROM=QualiTracker Website <website@qualitracker.com>
- RESEND_API_KEY: a sending API key, stored only in backend secrets.
- DATABASE_URL: the existing PostgreSQL connection.
- PORT: backend listening port.

Verify the sender domain in Resend before using website@qualitracker.com. Set these variables through the backend host or process manager; .env.example is documentation and is not automatically loaded. Never place the API key or database URL in VITE_ variables, frontend code, or Git. API reference: https://resend.com/docs/api-reference/emails/send-email

## Message

Subject: New QualiTracker Waitlist Submission — Jane Doe

Full name: Jane Doe
Work email: jane@lab.org
Laboratory / organization: Regional Medical Laboratory
Organization type: Public medical laboratory
Country: Tanzania
Role: Quality Manager
Expectations for the product: Better document control and accreditation preparation.

Submission Details
Date (UTC): actual database creation timestamp
Source: QualiTracker Waitlist Page
Status: New
Submission ID: database lead ID

Both HTML and plain text are sent. The HTML work email is clickable; Reply-To is the submitter's email, so Reply addresses that person. Submitted text is HTML-escaped.

## Deployment requirement

The current .github/workflows/static.yml deploys only the frontend to GitHub Pages. It does not start artifacts/api-server or PostgreSQL. The frontend currently posts to the same-origin /api/leads. A backend must run and that path must route to it, for example through a reverse proxy on the website host. GitHub Pages deployment by itself does not establish this route. If retaining Pages with a separately hosted API, configure an explicit frontend API URL and appropriate backend CORS as a follow-up once the backend location is known.

Do not assume live submissions are stored based solely on this source code. After deployment, submit a unique test entry, confirm its PostgreSQL record, then confirm email delivery, all seven fields, and Reply-To.

## Local verification

On Node 22.18+ or Node 24:
node --test artifacts/api-server/tests/waitlist-notification.test.mjs

Tests mock delivery; no email is sent.
