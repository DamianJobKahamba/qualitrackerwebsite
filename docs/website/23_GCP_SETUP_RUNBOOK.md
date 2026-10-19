# GCP setup runbook (project `peppy-house-510317-n5`)

Steps **a person with Owner access runs** in a terminal with `gcloud`/`firebase` (or Cloud Shell). They cannot be run from the dev machine used for the code changes: `gcloud` is not installed there and the stored Firebase login has expired. Nothing here has been run yet.

Companion to `22_GCP_PLAN.md`. Region decision: **`africa-south1` (Johannesburg)** for stored data. See "What stays in Africa and what doesn't" before relying on that for privacy claims.

## 0. Sign in and attach Firebase (5 min)

```bash
firebase login --reauth                       # browser sign-in as an Owner of the project
firebase projects:addfirebase peppy-house-510317-n5
gcloud config set project peppy-house-510317-n5
gcloud services enable firebase.googleapis.com firebasehosting.googleapis.com \
  firestore.googleapis.com cloudfunctions.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com logging.googleapis.com monitoring.googleapis.com
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
PROJECT=peppy-house-510317-n5
PROJECT_NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
gcloud iam service-accounts create gh-hosting-deploy --display-name="GitHub Hosting preview deploy"
SA=gh-hosting-deploy@$PROJECT.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/firebasehosting.admin
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/serviceusage.serviceUsageConsumer
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github-oidc --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' \
  --attribute-condition="assertion.repository=='DamianJobKahamba/qualitrackerwebsite'"
gcloud iam service-accounts add-iam-policy-binding $SA \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/DamianJobKahamba/qualitrackerwebsite"
echo "GCP_SERVICE_ACCOUNT=$SA"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc"
```

Save the two printed values as GitHub repo **variables** (not secrets) with the same names. The `attribute-condition` limits this to the website repo only. The roles are the commonly needed pair for channel deploys; if the first deploy reports a missing permission, add only what the error names (unverified until run).

## 3. First preview deploy

GitHub > Actions > "Firebase Hosting preview" > Run workflow (branch `dev`, channel `dev`). Open the printed URL and test all three forms, the nav, `/book-demo/`, and a bad URL (should show the site's own 404). Check the browser console for `[Report Only]` CSP messages; the site produced none in local testing.

## 4. Custom-domain cutover (live site) — only after step 3 is happy

Findings on `qualitracker.com` today (public DNS lookup, 2026-10-19):
- **Nameservers are `*.dns-parking.com`, which appears to be Hostinger, not Google.** Confirm where the domain is registered and where its DNS is edited before planning the cutover.
- `A` records point at GitHub Pages (`185.199.108-111.153`); `www` is a CNAME to `damianjobkahamba.github.io`.
- **Email is live and must not break:** `MX` -> Google (`SMTP.GOOGLE.com`); SPF `TXT` includes both `_spf.mail.hostinger.com` and `_spf.google.com`; a Google site-verification `TXT` exists.

Steps: Firebase Console > Hosting > Add custom domain (`qualitracker.com` and `www`). Firebase shows the exact records. Then, in the DNS editor: lower the TTL on the `A`/`CNAME` records a day ahead; replace **only** the `A` (and `www` `CNAME`) records with Firebase's values; add Firebase's verification `TXT` alongside what exists; **do not edit `MX` or the existing `TXT` records.** TLS certificates are issued automatically (can take minutes to hours). Rollback = restore the old GitHub `A` records. After it is stable, disable `static.yml` (or leave it, it only serves the old `github.io` address).

## 5. Enforce security headers

`firebase.json` ships `Content-Security-Policy-Report-Only`. After a few days of real traffic on the preview/live site with no console violations, rename the header key to `Content-Security-Policy`. Add `includeSubDomains`/`preload` to HSTS only once every subdomain of `qualitracker.com` is HTTPS-only (it currently sets `max-age=31536000` only).

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
