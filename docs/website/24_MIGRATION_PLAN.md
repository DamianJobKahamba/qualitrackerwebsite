# Move everything from Hostinger and Contabo to Google Cloud

Written 2026-10-20 for execution starting 2026-10-21. Status of every claim is marked **[verified]** (checked from outside by us), **[assumed]** (believed, not checked) or **[unknown]** (needs the inventory). Companion docs: `23_GCP_SETUP_RUNBOOK.md` (details and commands), `docs/dns/qualitracker.com.zone` (target DNS), `docs/migration/*.sh` (server scripts).

## 1. What exists today

| Where | What | Status |
|---|---|---|
| Hostinger | Domain registration `qualitracker.com` (expires 2027-08-04) and its DNS zone | [verified] |
| Hostinger | Any hosting/email/VPS plans, other domains on the account | [unknown] team to list (section 5, Hostinger checklist) |
| Google | Website live on Firebase Hosting, project `qualitracker-website-e6c53` | [verified] |
| Google | Workspace email (MX, DKIM) | [verified] |
| Contabo (`5.189.158.117`, Germany) | nginx + Node/Express backend for the MeLSAT challenge, plus the `chat` / `dev.chat` sites | [verified] it answers; contents [unknown] |
| Contabo | Participant data (registrations, tokens, scores, staff login), database type | [assumed] on the server only; [unknown] type |
| Contabo | Source code of the challenge backend | [unknown] not in any repo visible to the team account |

## 2. Target on Google Cloud (project `qualitracker-website-e6c53`)

| Today | Becomes | Region |
|---|---|---|
| Hostinger DNS | **Cloud DNS** zone `qualitracker-com` | global |
| Hostinger registration | **Cloud Domains** transfer (or another registrar if Google does not offer `.com` transfers to this account) | n/a |
| Challenge + demo front-end (HTML/JS/CSS) | **Firebase Hosting**, extra sites `qualitychallenge` and `demochallenge` in the same project | CDN |
| Challenge backend (Express) | **Cloud Run** container | `africa-south1` |
| Challenge data | **Firestore** or **Cloud SQL** (decided from the inventory: SQLite/JSON files -> Firestore; SQL schema -> Cloud SQL) | `africa-south1` |
| `.env` secrets | **Secret Manager** | `africa-south1` replication |
| `chat` / `dev.chat` | decided from the inventory (likely a second Hosting site) | |
| Backups | private **Cloud Storage** bucket | `africa-south1` |

Browser -> backend: Firebase Hosting rewrites do not list `africa-south1`, so the front-end calls the Cloud Run URL directly. The challenge front-end already reads `API_BASE` from `config.js` (currently `'/api'`), so this is a one-line change per site. Lock the API's CORS to the exact site origins (today it answers any origin).

## 3. Who does what

| Person | Needs | Does |
|---|---|---|
| **Google project Owner** (`info@qualitracker.com`) | Owner on the project, 2-step verification on | billing, enable APIs, bucket, Cloud DNS, registrar transfer; add a second Owner |
| **Damian** (server access) | SSH to Contabo | run the two scripts, copy the backup to the bucket |
| **Whoever owns the Hostinger login** | hPanel access | unlock domain, get transfer code, list products, change nameservers |
| **Claude (in this repo)** | inventory output + source | Dockerfile, Hosting config, `config.js` changes, tests, runbook updates. Cannot log in to Contabo, Hostinger or run `gcloud` |

## 4. Order of work (and what is realistic tomorrow)

**Tomorrow (2026-10-21), in this order:**
1. **Prerequisites (Owner, ~30 min).** Billing attached; add a second Owner; create budget alerts; in Cloud Shell run the API enable commands, then create the private backup bucket:
   ```bash
   gcloud config set project qualitracker-website-e6c53
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
     firestore.googleapis.com secretmanager.googleapis.com dns.googleapis.com storage.googleapis.com
   gcloud storage buckets create gs://qualitracker-migration-backups --location=africa-south1 \
     --uniform-bucket-level-access --public-access-prevention
   ```
2. **Inventory + backup of Contabo (Damian, ~1 h).** `sudo bash contabo-inventory.sh > inventory.txt` (read-only, no secret values; skim before sharing), then `sudo bash contabo-backup.sh /path/to/app --<db flag>` for each app, upload the folder to the bucket, **restore-test on a laptop** (open the SQL/db file, un-tar the app). Do not delete anything on the server.
3. **Cloud DNS zone, not yet live (Owner, ~30 min).** Create the zone, import `docs/dns/qualitracker.com.zone`, compare every record with Hostinger's answers (runbook 8a). Do **not** change nameservers yet.
4. **Hostinger inventory (login owner, ~20 min).** Do the checklist in section 5; unlock the domain and *request* the transfer code (keep it private).
5. **Send Claude** the inventory file (secrets-free) and tell it where the source lives. Claude then builds the container, hosting config and migration for each app.

**Not realistic in one day, so plan them as follow-ups:** moving the Express backend and database to Cloud Run/Firestore (needs the source and a tested data import), and the registrar transfer (takes days once started). Switching nameservers can happen as soon as step 3 matches exactly, and propagates over up to 48 hours.

**After tomorrow:** (a) containerise and deploy the challenge backend, import the data, point both front-ends at it, test a full registration and quiz on a preview, (b) switch nameservers to Cloud DNS, (c) start the registrar transfer, (d) move `chat`/`dev.chat`, (e) run both old and new side by side for **14 days**, (f) only then cancel Contabo and Hostinger. Keep the backups for at least 12 months unless a data-retention decision says otherwise.

## 4a. Phase order (team decision, 2026-10-20)

**Correction that shapes it:** the demo and quality challenge sites do **not** run on Hostinger. They run on the Contabo server (`5.189.158.117`, verified: it answers for both host names). Hostinger holds only the domain registration and DNS. So "moving the challenges to Google" *is* the first part of moving off the Contabo VPS, and "leaving Hostinger" is a DNS/registrar job.

| Phase | Scope | Done when |
|---|---|---|
| **1. Web properties on Google** | (a) main website: **done**, live on Firebase Hosting. (b) `demochallenge` and (c) `qualitychallenge`: front-end -> Firebase Hosting sites, backend -> Cloud Run, data -> Firestore/Cloud SQL, secrets -> Secret Manager, all in `africa-south1`. | Both challenge sites pass a full registration + quiz + leaderboard test on a preview and then on their real host names, served from Google. |
| **2. The rest of the VPS** | `chat` / `dev.chat` and anything else the inventory finds on Contabo, then 14 days side by side. | Contabo receives no traffic for 7 days; backups verified; server cancelled. |
| **3. Hostinger** | DNS -> Cloud DNS, registration -> Google (or another registrar), then cancel the plans. | Nameservers and registrar are no longer Hostinger. |

**Gate to start Phase 1b/1c:** Damian's inventory and backup of the Contabo server (section 4, step 2) and the location of the challenge backend's source code. Without the source and the data, the challenge backend cannot be rebuilt on Google.

**Recommendation: do the DNS move (Phase 3, first half) at the start of Phase 1, not the end.** Phase 1 needs several DNS changes (verification and routing records for the two new Hosting sites, restoring the two missing host names). Doing them in Hostinger's panel means more manual edits and slow, uneven replication between its two nameservers (seen on 2026-10-19). With Cloud DNS the edits are made once, in Google, and are checked with `dig` straight away. The zone file is ready (`docs/dns/qualitracker.com.zone`); the switch needs the record-by-record comparison in runbook 8a and a mail test. The registrar transfer can still wait until the end.

## 5. Checklists

**Hostinger (login owner)** - note the answers in this file:
- [ ] Which products are active (Hosting, Email, VPS, Website builder, other domains)? Renewal dates and costs.
- [ ] Anything hosted there that is still used (old website files, databases, cron jobs, mailboxes)? Export before cancelling.
- [ ] Domain: lock is on (`client transfer prohibited`); registrant details changed on 2026-10-19, which may delay a transfer (60-day rule). Ask support to waive it if refused.
- [ ] DNS: re-export the zone right before the nameserver switch (the 2026-10-19 export had an older change counter than the live zone).

**Before nameservers switch:**
- [ ] Every record in `qualitracker.com.zone` answers identically from a Cloud DNS nameserver and from Hostinger (`dig @ns A/TXT/MX/CNAME`).
- [ ] Mail test planned (send + receive on `info@` right after the switch); SPF/DKIM/DMARC unchanged.
- [ ] TTLs lowered 24 h earlier if possible.
- [ ] Someone is available for the next 2 hours.

**Before cancelling Contabo/Hostinger (after 14 days):**
- [ ] Both challenge sites work end to end on Google (register, token, quiz, leaderboard) and the old server received no traffic for 7 days.
- [ ] Backup restore was tested; bucket copy verified with checksums.
- [ ] Registrar is no longer Hostinger; DNS answers come from Google nameservers.
- [ ] Participant data handling decided and written down (keep/delete/retention).

## 6. Risks

| Risk | Mitigation |
|---|---|
| The server holds the only copy of participant data and the app | Backup first, restore-test, keep the server running until verified |
| Cancelling Hostinger loses the domain or DNS | Registrar transfer and DNS move are done and verified first |
| Mail breaks during the nameserver switch | Zone copied exactly (SPF unchanged), compared record by record, mail tested immediately; rollback = set the nameservers back to Hostinger's (keep that zone untouched) |
| Backup archive contains secrets | 700/600 permissions, private bucket with public access prevention, never emailed or pasted, server copy deleted after the restore test |
| Google may not offer `.com` transfers for this account | Confirm in the console on day one; fall back to another registrar, everything else still moves |
| Rewrites to `africa-south1` unsupported | Direct Cloud Run URL (one-line `config.js` change) |
| Personal data moves countries (Germany -> South Africa) | Needs a privacy-notice and retention decision before launch; legal review |
| Single person (Damian) is the only one with server access | Backup done tomorrow; he also shares SSH access with a second maintainer if possible |
