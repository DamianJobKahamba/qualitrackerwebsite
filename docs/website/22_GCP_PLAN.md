# QualiTracker Website — Google Cloud Plan

Status: **decisions made, config prepared, nothing deployed.** See `23_GCP_SETUP_RUNBOOK.md` for the steps an Owner runs.

## Decisions (2026-10-19)

| Question | Answer |
|---|---|
| GCP project | `peppy-house-510317-n5` (billing contact given as `info@qualitrqacker.com` — looks like a typo, to confirm) |
| Google Workspace | **Yes** (public DNS also shows Google `MX`) -> Gmail API / Calendar options open |
| Who controls DNS | Team believes Google; **public lookup shows `dns-parking.com` nameservers (appears to be Hostinger).** To confirm before cutover |
| Move to Firebase Hosting | **Yes** |
| Data region | **`africa-south1` (Johannesburg)** for stored data; honest limits in the runbook's residency table |

**Phase 2 (lead endpoint) is built and unit-tested but not deployed:** `artifacts/lead-api`, runbook section 6. Sender defaults to `info@qualitracker.com` (one env var to change).

Prepared on `dev`: `firebase.json` (headers, caching, trailing slashes, 404; tested on the local hosting emulator), `.firebaserc`, `.github/workflows/firebase-hosting.yml` (manual, preview-only). Written on `dev` after the framework audit (21_*). I cannot see the QualiTracker GCP project from the dev machine (no `gcloud`, no GCP config in the repo), so anything about the account is an **assumption** until confirmed.

## Facts needed from the team (blocks Phase 1+)

| # | Question | Why it matters |
|---|---|---|
| 1 | GCP project ID, billing account, who is Owner | Everything below lives in one project |
| 2 | Is `info@qualitracker.com` a **Google Workspace** mailbox? | Decides the email-sending and calendar options (Phases 2 and 4) |
| 3 | Who controls DNS for `qualitracker.com`? | Needed to point the domain at GCP and to verify email sending |
| 4 | Is GitHub Pages staying as the host, or moving? | **Answered: moving to Firebase Hosting** |

## What GCP fixes in the audit

| Audit finding | GCP answer | Phase |
|---|---|---|
| M3 No security headers (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) | Host on Firebase Hosting, headers set in `firebase.json` | 1 |
| H4 Form abuse (EmailJS key is public, browser-side) | Server-side endpoint with App Check / reCAPTCHA + rate limiting | 2 |
| H1 No analytics | GA4 with Consent Mode v2, exported to BigQuery | 3 |
| H2 Privacy: no stated retention, third-party processor (EmailJS) | Leads stored in Firestore in a chosen region with a stated retention period | 2 |
| Booking only emails a request | Optional real availability via Google Calendar | 4 |

## Phase 1 — Hosting and headers (Firebase Hosting)

Recommendation: **Firebase Hosting** (it is Google Cloud: global CDN, managed TLS, custom domain, free tier is ample for a static marketing site).

- `firebase.json`: serve `dist/public`, `cleanUrls` + trailing-slash to match the prerendered `/route/index.html` files, `404.html` for unknown URLs, and the headers above. Long-cache hashed assets, short-cache HTML.
- CSP must allow only what the site uses today: self, Google Fonts (fonts.googleapis.com / fonts.gstatic.com), and — once Phases 2–3 land — the form endpoint and Google Analytics. Ship it as **Content-Security-Policy-Report-Only** first, check for violations, then enforce.
- **Preview channels give us the "test on dev before main" step for real**: every push to `dev` deploys to a temporary URL (expires in days); `main` deploys to live. This replaces the manual "test the forms yourself" gap.
- CI auth: **Workload Identity Federation** from GitHub Actions to a deploy-only service account. No JSON key files in GitHub secrets.
- Cutover: keep Pages live, verify the Firebase site, lower DNS TTL, switch the domain, then retire the Pages deploy workflow. Rollback = point DNS back.
- Alternative if you prefer more control: Cloud Storage + external HTTPS load balancer + Cloud CDN (+ Cloud Armor). More moving parts and a standing load-balancer cost; only worth it if you need Cloud Armor rules.

## Phase 2 — Forms (replace browser-side EmailJS)

Today waitlist, talk-to-team and demo requests all POST from the browser to EmailJS with a public key. Plan: one server-side endpoint.

- **Cloud Run function** (2nd gen Cloud Function) `submitLead`, region chosen with the team (data residency is a privacy-page question — confirm before picking).
- Firebase Hosting rewrite: `/api/lead` → the function, so the site stays same-origin (no CORS, CSP stays tight).
- On each request: validate the same fields `src/lib/leads.ts` validates today (re-validate server-side; never trust the client), verify **App Check (reCAPTCHA Enterprise)**, apply per-IP rate limiting, then
  1. write the lead to **Firestore** (system of record; today a failed email means a lost lead),
  2. email the team.
- Email options, depending on fact #2: **Workspace** → send via the Gmail API or SMTP relay from a service identity; no Workspace → a transactional provider (SendGrid / Mailgun) with API key in **Secret Manager**. Reply-To stays the visitor so "reply to accept" keeps working.
- Frontend change is small: `sendViaEmailJs` in `leads.ts` becomes `fetch('/api/lead')`. Keep EmailJS as the fallback until the endpoint is proven, then delete it.
- Retention: decide a period (e.g. 24 months, **to be set by the team/legal**), enforce with a Firestore TTL policy, and state it on `/privacy`.
- Dashboards/alerts: Cloud Logging + a log-based alert on endpoint errors, so a broken form can't fail silently again (this was audit finding C1).

## Phase 3 — Analytics (needs a consent decision)

- **GA4** with **Consent Mode v2**, default denied, plus a small consent banner. Analytics cookies require the banner and a privacy-notice update; `/privacy` currently says there are none, so the order is: privacy copy → banner → tag.
- Events that matter for this site: `cta_click` (which CTA: waitlist / talk / book demo), `form_start`, `form_submit_success`, `form_submit_error` per form kind, and `page_view` per route.
- Link GA4 to **BigQuery** (daily export) and build a **Looker Studio** dashboard: visits → CTA click → form success by source page. That answers "which page produces waitlist signups", which is unknowable today.
- Cookie-free fallback if the team prefers no banner: count only server-side signals (form submissions in Firestore, Hosting request logs) — less insight, no consent burden.
- Re-run Lighthouse after adding the tag; the audit set a performance budget and GA must not break it (load it after interaction/idle).

## Phase 4 — Demo booking with real availability (optional)

Three levels, cheapest first:
1. **Now (shipped on `dev`):** request form → email → reply to confirm. No availability check.
2. **Workspace appointment schedule:** if fact #2 is yes, Google Calendar's bookable appointment page can be linked or embedded; visitors see real free slots and get invites automatically. No backend. Style control is limited.
3. **Custom:** the Phase 2 function reads **Calendar API free/busy** for the team calendar, the form offers only open slots, and accepting creates the event + Meet link. Most work; only if (2) isn't enough.

## Phase 5 — Operations and security

- **Cloud Monitoring uptime check** on `https://qualitracker.com/` (and `/waitlist/`) alerting `info@qualitracker.com`.
- **Budget alert** on the billing account (e.g. at 50% / 90% of a small monthly cap).
- IAM least privilege: one service account for the function (Firestore write + Secret access only), one for CI deploys; no user-owned keys.
- Enable Cloud Audit Logs; restrict Firestore with deny-all security rules (only the function writes via admin SDK).
- Write the runbook: how to rotate the email secret, how to export/delete a person's lead on request.

## Suggested order and rough effort

| Order | Work | Effort | Needs from team |
|---|---|---|---|
| 1 | Facts 1–4 above | — | project ID, Workspace?, DNS, host decision |
| 2 | Phase 1 (Firebase Hosting + headers + preview channels) | ~1 day | project + DNS access |
| 3 | Phase 2 (lead endpoint + Firestore + email) | 2–3 days | email-sending decision, region, retention period |
| 4 | Phase 3 (consent + GA4 + BigQuery) | 1–2 days | consent/banner decision, privacy copy |
| 5 | Phase 5 (monitoring, budget, IAM) | ~½ day | — |
| 6 | Phase 4 (calendar) | ½–3 days | Workspace answer |

## Not decided here / not verified

- Nothing in this document has been run against GCP. Costs, quotas and exact product behaviour should be confirmed in the console before committing.
- Region/data-residency and retention are policy decisions for the team and legal review, not engineering defaults.
- `/privacy` must be updated in the same change as any new data processing (Firestore storage, analytics).
