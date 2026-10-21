# One-year cost: Hostinger + Contabo (today) vs. all-GCP (after the move)

Written 2026-10-21. **I don't have access to your actual Hostinger or Contabo invoices** — those figures are current public list prices, found and cited below, not your real bill. The real bill is almost certainly more accurate than any estimate here; if you can paste the last Hostinger and Contabo invoices (amounts only, no account numbers), I'll replace these rows with your real numbers. GCP figures are Google's own published rates applied to this project's actual shape (an 888 KB static site, two low-traffic quiz apps, the lead endpoint built but not yet live).

## What's being compared

| | Today | After the move |
|---|---|---|
| Domain registration | Hostinger | **Unchanged — stays at Hostinger.** Cloud Domains cannot accept this transfer (verified: Google disabled third-party-registrar transfers into Cloud Domains in 2023, when Google Domains was sold to Squarespace). So domain cost is identical in both columns and isn't a reason to move anything. |
| DNS | Hostinger (free, bundled with the domain) | Cloud DNS (paid per zone + per query) |
| Website hosting | — (already moved to Firebase, not Hostinger) | Firebase Hosting |
| Email | Google Workspace (unchanged either way) | Google Workspace (unchanged either way) |
| Challenge apps + VPS | Contabo VPS | Cloud Run + Firestore + Secret Manager |

## 1. Hostinger (today) — list prices, not your invoice

| Item | List price found | Source |
|---|---|---|
| `.com` renewal | **$19.99/yr** (3rd-party trackers report Hostinger's own renewal around that figure; promotional first-year prices as low as $9.99 don't apply at renewal) | [domainoffer.net](https://domainoffer.net/tld/com/hostinger), [startupowl.com](https://startupowl.com/reviews/hostinger-domains) |
| Any hosting/email/VPS plan still active there | **Unknown — found in your checklist, not priced here** | section 5 of `24_MIGRATION_PLAN.md` |
| **Hostinger subtotal (domain only, known)** | **≈ $20/yr** | |

## 2. Contabo VPS (today) — list prices, not your invoice

Third-party trackers disagree by plan/term/currency; I'm using the entry-level tier since the two quiz apps and `chat`/`dev.chat` are small Node/nginx services, not a heavy workload.

| Term | Price found | Source |
|---|---|---|
| Cheapest current tier, 24-month term | €5.28/mo ≈ **$69/yr** | [toolradar.com](https://toolradar.com/tools/contabo/pricing) |
| Same tier, 1-month (no-commitment) term | €6.60/mo ≈ **$86/yr** | toolradar.com |
| Older dollar-quoted entry tier | $5.20–5.50/mo ≈ **$62–66/yr** | [temperstack.com](https://www.temperstack.com/plans/contabo/) |
| **Contabo subtotal (estimate range)** | **≈ $65–85/yr** | |

**Combined today, domain + VPS: roughly $85–105/yr** — plus whatever other Hostinger products are active (unknown).

## 3. All-GCP (after the move)

Google's published rates, applied to this project. The free tier covers nearly everything at this traffic level — the paid lines are the ones that don't have a free allowance at all.

| Item | Rate | This project's shape | Estimated cost |
|---|---|---|---|
| **Firebase Hosting** | 10 GB storage free (Blaze), then $0.026/GB; CDN transfer metered beyond a free daily/monthly cap | Site is 888 KB; two quiz front-ends would add well under 1 MB more. Nowhere near the free storage cap at this traffic | **$0/yr** (realistically) |
| **Cloud Run** (challenge backend) | 2,000,000 requests/month free, then ~$0.40/million; compute time has its own free tier too | A closed, low-traffic quiz app — register/quiz-start/submit/leaderboard polling for a few hundred participants, not millions of requests | **$0/yr** (stays inside the free tier) |
| **Firestore** (`africa-south1`) | 1 GiB storage, 50k reads/day, 20k writes/day, 20k deletes/day, 10 GiB egress/month — all free, project-wide | Registrations + quiz scores for a few hundred people is a few thousand documents, nowhere near these caps | **$0/yr** |
| **Secret Manager** | 6 active secret versions free, then $0.06/version/month; access calls also have a free tier | A handful of secrets (API keys, DB creds) | **$0/yr** (realistically) |
| **Cloud DNS** | **No free tier.** $0.20/zone/month for the first 25 zones; queries $0.40/million | 1 zone (`qualitracker.com`), low query volume | **1 × $0.20 × 12 = $2.40/yr** zone fee, + well under $1/yr in queries at this traffic → **≈ $2–3/yr** |
| **Cloud Storage** (backup bucket) | ~$0.023/GB/month standard storage in most regions | A few hundred MB of backups | **well under $1/yr** |
| **Domain registration** | Stays at Hostinger — **not a GCP cost, unchanged from today** (see note above) | — | **$0 change** |
| **GCP subtotal** | | | **≈ $3–5/yr** |

Note: this is below Google Cloud's free-tier promotional credit most new billing accounts get, so the real first-year bill could be $0. It also assumes no Cloud Run cold-start/compute overage, which is realistic for a closed quiz app with a few hundred users, not millions.

## 4. Side-by-side summary

| | Today (Hostinger + Contabo) | After the move (all-GCP) |
|---|---|---|
| **Estimated yearly cost** | **≈ $85–105/yr** (domain + VPS only; excludes any unknown Hostinger extras) | **≈ $3–5/yr** |
| **What's included** | Domain, DNS (free, bundled), VPS running 4 small apps | Hosting for the site + 2 challenge front-ends, Cloud Run backend, Firestore, Secret Manager, Cloud DNS, backup storage |
| **What's NOT included in either column** | Email (Google Workspace, already paid for, unchanged either way) | Same |
| **Domain registration** | Stays at Hostinger either way — identical cost in both columns | |

**Bottom line: the move looks like it saves roughly $80–100/year**, mainly because the Contabo VPS is replaced by services that sit entirely inside Google's free tiers at this traffic level, and because the domain itself doesn't need to move for the GCP migration to work.

## 5. What would change this estimate

- **Your real Hostinger/Contabo invoices.** List prices and real invoices can differ a lot (currency, discounts, add-ons already bought). This is the single biggest source of error here.
- **Other Hostinger products** (section 5 checklist in `24_MIGRATION_PLAN.md`) — not priced because they're not yet inventoried.
- **Real traffic for the challenge apps.** If a future challenge brings in thousands of simultaneous participants rather than a few hundred, Cloud Run and Firestore costs are still likely to stay small (the free tiers are generous), but it's worth re-checking once real numbers exist.
- **Whether the domain is later moved off Hostinger anyway** (to Squarespace Domains or another registrar, per the corrected runbook) — that's a decision independent of cost, and roughly a wash either way (most registrars charge similar `.com` renewal rates).
