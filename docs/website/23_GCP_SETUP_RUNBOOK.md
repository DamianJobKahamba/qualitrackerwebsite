# GCP setup runbook (project `qualitracker-website-e6c53`, decided 2026-10-19)

Steps **a person with Owner access runs** in a terminal with `gcloud`/`firebase` (or Cloud Shell). They cannot be run from the dev machine used for the code changes: `gcloud` is not installed there and the stored Firebase login has expired. Nothing here has been run yet.

Companion to `22_GCP_PLAN.md`. Region decision: **`africa-south1` (Johannesburg)** for stored data. See "What stays in Africa and what doesn't" before relying on that for privacy claims.

## 0. Sign in and attach Firebase (5 min)

```bash
firebase login --reauth                       # browser sign-in as an Owner of the project
# (already a Firebase project: no addfirebase needed)
gcloud config set project qualitracker-website-e6c53
gcloud services enable firebase.googleapis.com firebasehosting.googleapis.com \
  firestore.googleapis.com cloudfunctions.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com logging.googleapis.com monitoring.googleapis.com \
  gmail.googleapis.com
```

Confirm billing is attached to the project (Console > Billing). Note: the billing contact was given as `info@qualitrqacker.com` — that looks like a typo of `qualitracker.com`; check it in the console so invoices and alerts do not bounce.

## 1. Data region (do this BEFORE anything writes data)

Firestore's location **cannot be changed after the database is created.**

```bash
gcloud firestore databases create --database='(default)' \
  --location=africa-south1 --type=firestore-native
```

Regional (not multi-region) is chosen: lower cost and write latency, 99.99% SLA (multi-region is 99.999%). `africa-south1` is listed on Google's [Firestore locations page](https://firebase.google.com/docs/firestore/locations). Cloud Functions in `africa-south1` are 2nd gen only, which is what the plan uses ([function locations](https://firebase.google.com/docs/functions/locations)).

## 2. Keyless GitHub -> GCP deploys (Workload Identity Federation)

```bash
PROJECT=qualitracker-website-e6c53
PROJECT_NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
gcloud iam service-accounts create gh-hosting-deploy --display-name="GitHub Hosting preview deploy"
SA=gh-hosting-deploy@$PROJECT.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/firebasehosting.admin
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/serviceusage.serviceUsageConsumer
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github-oidc --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' \
  --attribute-condition="assertion.repository=='Qualitracker/qualitrackerwebsite'"
gcloud iam service-accounts add-iam-policy-binding $SA \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/Qualitracker/qualitrackerwebsite"
echo "GCP_SERVICE_ACCOUNT=$SA"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc"
```

Save the two printed values as GitHub repo **variables** (not secrets) with the same names. The `attribute-condition` limits this to the website repo only. The roles are the commonly needed pair for channel deploys; if the first deploy reports a missing permission, add only what the error names (unverified until run).

## 3. First preview deploy

GitHub > Actions > "Firebase Hosting preview" > Run workflow (branch `dev`, channel `dev`). Open the printed URL and test all three forms, the nav, `/book-demo/`, and a bad URL (should show the site's own 404). Check the browser console for `[Report Only]` CSP messages; the site produced none in local testing.

## 4. Custom-domain cutover (live site) — only after step 3 is happy

Findings on `qualitracker.com` (public DNS lookups, 2026-10-19), corrected after the team confirmed the website itself was moved off Hostinger to GitHub Pages:
- **The website is served from GitHub Pages** (`A` records `185.199.108-111.153`; `www` is a CNAME to `DamianJobKahamba.github.io`, which no longer matches the repo's new owner). Hosting is no longer at Hostinger. **As of 2026-10-19 the apex and `www` return HTTP 404 from GitHub because the Pages custom domain was removed while DNS still points at GitHub: the site is down until the Firebase cutover (or Pages is re-enabled).**
- **The DNS zone is still at Hostinger.** The nameservers are `orbit`/`horizon.dns-parking.com` and the zone's SOA names `dns.hostinger.com` (last changed 2026-10-15). Hosting and DNS are separate: the records are still edited in Hostinger's DNS panel until the nameservers are changed at the registrar. Who the registrar is could not be determined (whois returned nothing); check where the domain is registered/renewed.
- **Do not cancel or let lapse the Hostinger account until the DNS has been moved (or confirmed to survive).** If the DNS zone disappears with it, the website and email stop working. Either keep the zone there, or move the nameservers (e.g. to Cloud DNS in this project) first and copy every record across.
- **Other records in the Hostinger zone that must be preserved** (from the exported zone file): `chat`, `dev.chat`, `demochallenge`, `qualitychallenge` -> `A 5.189.158.117` (some other server; owner to confirm); `google._domainkey` TXT (Google Workspace DKIM); `_dmarc` TXT `v=DMARC1; p=none` (monitor-only, no report address); `autoconfig`/`autodiscover` CNAMEs to Hostinger mail (suggests Hostinger mailboxes may still exist; confirm before dropping the SPF include). Only the 4 apex `A` records and the `www` CNAME change at cutover.
- **Email is live and must not break:** `MX` -> Google (`SMTP.GOOGLE.com`); SPF `TXT` includes both `_spf.mail.hostinger.com` and `_spf.google.com`; a Google site-verification `TXT` exists. If no mail is sent through Hostinger any more, the Hostinger SPF include can be removed later; confirm first.

Steps: Firebase Console > Hosting > Add custom domain (`qualitracker.com` and `www`). Firebase shows the exact records. Then, in the DNS editor (Hostinger's DNS panel, unless the nameservers have been moved): lower the TTL on the `A`/`CNAME` records a day ahead; replace **only** the `A` (and `www` `CNAME`) records with Firebase's values; add Firebase's verification `TXT` alongside what exists; **do not edit `MX` or the existing `TXT` records.** TLS certificates are issued automatically (can take minutes to hours). Rollback = restore the old GitHub `A` records. After it is stable, disable `static.yml` (or leave it, it only serves the old `github.io` address).

## 5. Enforce security headers

`firebase.json` ships `Content-Security-Policy-Report-Only`. After a few days of real traffic on the preview/live site with no console violations, rename the header key to `Content-Security-Policy`. Add `includeSubDomains`/`preload` to HSTS only once every subdomain of `qualitracker.com` is HTTPS-only (it currently sets `max-age=31536000` only).

## 6. Deploy the lead endpoint (`artifacts/lead-api`)

What it does: the three website forms POST to this Cloud Run function in **Johannesburg**. It checks the browser origin, size and a hidden honeypot field, validates every field again, applies rate limits (5 per IP per hour, 3 per email per day, stored only as salted hashes), **saves the lead to Firestore first**, then emails the team through Gmail as `MAIL_SENDER` with Reply-To set to the visitor. If the email fails the visitor still sees success (the lead is saved) and an `ERROR` log `lead_email_failed` fires; if the save fails they get an error and the website falls back to EmailJS. Code and 28 unit tests: `artifacts/lead-api`.

**Sender decision:** it sends as `info@qualitracker.com` (the one mailbox known to exist) via `MAIL_SENDER`. To use a dedicated address, create that Workspace user, then change the one env var and the delegation `sub` follows automatically.

```bash
PROJECT=qualitracker-website-e6c53
REGION=africa-south1
SA_NAME=lead-api
SA=$SA_NAME@$PROJECT.iam.gserviceaccount.com

# a) runtime identity: may write Firestore, read its one secret, and sign delegation JWTs for itself
gcloud iam service-accounts create $SA_NAME --display-name="Lead API"
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/datastore.user
gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:$SA \
  --role=roles/iam.serviceAccountTokenCreator

# b) salt for hashing IPs/emails in the rate-limit store (kept in-region)
openssl rand -base64 32 | tr -d '\n' | gcloud secrets create lead-hash-salt --data-file=- \
  --replication-policy=user-managed --locations=$REGION
gcloud secrets add-iam-policy-binding lead-hash-salt --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor

# c) Firestore: deny-all rules + automatic deletion (TTL) of expired leads and rate counters
firebase deploy --only firestore:rules --project $PROJECT
gcloud firestore fields ttls update expireAt --collection-group=leads --enable-ttl --database='(default)'
gcloud firestore fields ttls update expireAt --collection-group=rate  --enable-ttl --database='(default)'
```

**d) Allow the service account to send mail (Workspace super-admin, once).** Get the numeric ID with `gcloud iam service-accounts describe $SA --format='value(uniqueId)'`. Then in admin.google.com: Security > Access and data control > API controls > **Manage Domain-Wide Delegation** > Add new: Client ID = that number; OAuth scope = `https://www.googleapis.com/auth/gmail.send` (only this one). This lets the function send mail as a user on your domain and nothing else; there is no key file to leak. If a send later logs `token exchange failed: HTTP 401`, this step is missing or has the wrong scope.

```bash
# e) deploy (builds TypeScript in Cloud Build via the package's gcp-build script)
gcloud functions deploy lead-api --gen2 --region=$REGION --runtime=nodejs22 \
  --source=artifacts/lead-api --entry-point=submitLead --trigger-http --allow-unauthenticated \
  --service-account=$SA --memory=256Mi --timeout=30s --max-instances=5 \
  --set-env-vars=MAIL_TO=info@qualitracker.com,MAIL_SENDER=info@qualitracker.com,RETENTION_DAYS=730 \
  --set-secrets=HASH_SALT=lead-hash-salt:latest
gcloud functions describe lead-api --gen2 --region=$REGION --format='value(serviceConfig.uri)'   # the URL
```

`--allow-unauthenticated` is required because browsers call it directly; if your organisation has a policy blocking public Cloud Run services the deploy will say so and an admin must allow it for this one service. The endpoint is protected by the origin check, validation and rate limits above, not by login.

**Why the browser calls the function's own URL:** Firebase Hosting's Cloud Run rewrites list a fixed set of regions that does not include `africa-south1` ([docs](https://firebase.google.com/docs/hosting/cloud-run)), so `/api/...` on the website cannot be routed there. Routing it through a supported region would send visitors' details through that region first, which defeats the point of choosing Johannesburg.

**Smoke test** (replace `URL`; expects `204`, then `400`, never `200` for the bad one):

```bash
curl -si -X OPTIONS -H 'Origin: https://qualitracker.com' URL | head -3
curl -s -X POST -H 'Origin: https://qualitracker.com' -H 'Content-Type: application/json' -d '{"kind":"waitlist","email":"x"}' URL
```
Then submit a real test from a preview deploy and check: a document appears in Firestore `leads` with `emailStatus: "sent"`, the email arrives at `info@` with Reply-To = the test address, and a second submission with the same address 4 times in a day gets blocked.

**f) Turn it on for the website.** Add a GitHub repo *variable* `LEAD_API_URL` = the function URL. The preview workflow passes it to the build as `VITE_LEAD_API_URL`; unset means forms keep using EmailJS only. **Do not set it for the live site until this checklist is done:**
- [ ] `/privacy` rewritten to match reality (leads stored in Firestore in Johannesburg, emailed via Google Workspace, EmailJS only as a fallback) and legally reviewed
- [ ] retention period decided (`RETENTION_DAYS` is a **placeholder of 730**) and stated on `/privacy`
- [ ] smoke test above passed on a preview URL
- [ ] alert created (below)

**g) Alert when a lead email fails or the store breaks:**
```bash
gcloud logging metrics create lead_api_errors --project=$PROJECT \
  --description="lead-api failures: email, store or rate-limit store" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="lead-api" AND jsonPayload.severity="ERROR"'
```
Then Console > Monitoring > Alerting > Create policy on metric `lead_api_errors` (condition: count > 0 over 5 min) with notification channel `info@qualitracker.com`. A lead whose email failed is not lost: it is in Firestore with `emailStatus: "failed"`. There is no automatic resend yet; re-send by hand from Firestore until one is added.

**Spam protection in place vs. not:** honeypot, origin allow-list, size/type limits, strict validation, per-IP and per-email rate limits. **Not in place:** a CAPTCHA / reCAPTCHA Enterprise check. A determined bot using real browsers or rotating IPs can still submit; if spam appears, add reCAPTCHA Enterprise (needs a key created in the console, a script allowed in the CSP, and a privacy-notice update).

## 7. Leaving Hostinger (decided 2026-10-19: everything on Google; Hostinger to be cancelled)

**Critical fact: Hostinger is also the domain REGISTRAR** (public registry lookup: registrar "HOSTINGER operations, UAB"; registered 2026-08-04, expires 2027-08-04; status `client transfer prohibited`, i.e. the transfer lock is on). Cancelling or letting the Hostinger account lapse before the domain is transferred out would put `qualitracker.com` at risk. Order matters:

1. **Restore the site first (Phase A, urgent: apex and `www` are both down as of 2026-10-19).**
   - The Firebase site `qualitracker-website-e6c53` currently serves "Site Not Found" (nothing deployed to its live channel); `www.qualitracker.com` is already listed as a custom domain there. Deploy the built site to its live channel, then add/confirm `qualitracker.com` + `www` as custom domains.
   - Firebase shows the exact records. In Hostinger's DNS panel replace only the 4 apex `A` records and (re)create `www`; add Firebase's verification `TXT`. Leave every other record alone.
2. **Move DNS to Google (Cloud DNS in the chosen project).** Create the zone, copy every record from the exported zone file (`/Users/justinmafie/Downloads/qualitracker.com.txt`, re-export first because its serial was older than the live one), check each with `dig @<cloud-dns-ns>`, then change the nameservers at Hostinger (registrar) to the Cloud DNS ones. Domain stays registered at Hostinger for now.
3. **Move the 4 extra subdomains' apps** (`chat`, `dev.chat`, `demochallenge`, `qualitychallenge` -> `5.189.158.117`) wherever they are going, then update those records in Cloud DNS. That server is not at Hostinger as far as can be told (not verified); confirm its host before deleting anything.
4. **Transfer the domain registration** out of Hostinger to a Google-side registrar (Cloud Domains in this project, if it supports `.com` transfers for your account; confirm in the console). At Hostinger: turn off the domain lock, disable privacy/proxy if it blocks it, and request the transfer (EPP/auth) code. **Never paste the code into chat or commit it**; enter it only in the registrar's transfer form. Expect several days; Hostinger may refuse transfers if the registrant details were changed in the last 60 days (the record shows a change on 2026-10-19), in which case ask them to waive it or wait. Keep the domain renewed until the transfer completes.
5. **Mail:** all mail is on Google Workspace (confirmed by the team). Before removing anything, make sure no mailbox/forwarder/old mail still lives at Hostinger (export it if so). Then remove `include:_spf.mail.hostinger.com` from the SPF `TXT` and the `autoconfig`/`autodiscover` CNAMEs. Leave the `MX`, `google._domainkey` DKIM and Google site-verification records untouched. Consider tightening DMARC from `p=none` to `quarantine` with an `rua=` report address after a few weeks of clean reports.
6. **Only then cancel Hostinger hosting/email/VPS plans.** Last, confirm the domain's registrar is no longer Hostinger and DNS answers come from the Google nameservers before closing the account.

**Project decision (made 2026-10-19):** one project, `qualitracker-website-e6c53`, for hosting, Firestore (`africa-south1`), the lead function, secrets and DNS. Two other projects are unused and can be deleted by the owner later, after confirming nothing is attached: `qualitracker-website` (an empty duplicate) and the GCP project `peppy-house-510317-n5` (never a Firebase project). Confirm billing is attached to `qualitracker-website-e6c53` before enabling Firestore or deploying the function.

## What stays in Africa and what doesn't

| Item | Location | Note |
|---|---|---|
| Leads in Firestore (Phase 2) | `africa-south1` | permanent once created |
| Form endpoint (Cloud Run function) | `africa-south1` | 2nd gen |
| Secret Manager secrets | choose user-managed replication = `africa-south1` | default is automatic (Google picks) |
| Static site files | **global CDN** | public marketing content, no personal data |
| Cloud Logging | default bucket is `global` | request logs include IPs; a regional log bucket + routing sink is possible, set up in Phase 2 |
| Email to `info@qualitracker.com` | Google Workspace | Workspace data regions are separate from GCP regions; lead details emailed to the team are stored in that mailbox |
| reCAPTCHA Enterprise / App Check | Google global service | verification calls leave the region |
| GA4 analytics (Phase 3) | Google global | cannot be pinned to Africa; the BigQuery export dataset can be |

So "stored lead records live in Johannesburg" will be true; "all data stays in Africa" will **not** be, and the privacy notice must not say it. Whether cross-border processing is acceptable under the data-protection law that applies to your visitors (for example Tanzania's Personal Data Protection Act 2022 or Kenya's Data Protection Act 2019) is a question for legal review.
