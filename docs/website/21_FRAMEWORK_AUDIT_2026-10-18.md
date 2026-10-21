# QualiTracker Website — Framework Audit (AUDIT mode)

**Date:** 2026-10-18 · **Audited:** live site `https://qualitracker.com` (GitHub Pages) and the `dev` branch at `331be15`
**Frameworks applied:** Website Audit & Build Framework (backbone), 17 Website Standard, 09 Accessibility, 13 Security, 30 Performance, 29 Testing, 27 DevOps/CI-CD, 11 Infrastructure, 07 Design System, 08 UX/UI, 05 UX Architecture, 03 User Research, 04 User Journeys, 36 Product Quality Scorecard. (16 Mobile Standard and WebApp framework: not applicable except where a form/journey overlaps; noted inline.)

**Evidence discipline:** every finding is tagged **Verified** (observed directly in code or on the live site, with the method) or **Inferred** (follows from verified facts but not directly observed). Anything I could not inspect is **Unscored** with what is needed to complete it. Lighthouse runs are single mobile-throttled lab runs (±5 points of run-to-run noise); they are not field data.

---

## 1. Executive Summary

The site is a well-built, honest, visually distinctive marketing site: clear positioning, real per-route prerendering, correct structured data, no fabricated proof, and automated accessibility/SEO scores of 100. **Its weaknesses are all in the layer the framework treats as non-negotiable: the conversion path, measurement, and legal/operational basics.**

1. **CRITICAL — the "Talk to the team" form cannot submit in production.** It POSTs to `/api/leads`; the live host (static GitHub Pages) answers **405**. That CTA is in the nav and hero of every page. Only the waitlist form works.
2. **There is no measurement at all** (no analytics, no error monitoring), so nobody would know the form above is broken or whether the waitlist converts.
3. **Personal data is collected with no privacy notice, policy or terms**, and `consent: true` is hard-coded rather than captured from the user.
4. **A regression I introduced:** the prerender step re-activates the Google Fonts stylesheet as render-blocking on every prerendered page; on production `/product` that pushes **LCP to 4.5s ("Poor")**.

Per the scorecard rule, these low categories (Analytics, Security headers, Conversion) are called out on their own rather than averaged into a comfortable number.

## 2. Business & Audience Understanding

- **Verified (site copy):** QualiTracker is a digital QMS plus a source-cited AI assistant (QualiBOT) for medical laboratories in East Africa; early-access / pre-launch; honestly staged status badges throughout.
- **Verified (site copy):** audiences addressed: lab directors, QMS officers, bench technologists, accreditors, multi-site organisations.
- **Not verified:** no personas, interview evidence or usage data exist in the repo (03 User Research). Treat all audience assumptions as **hypotheses**, not findings.
- **Business model on site:** none stated (pricing deliberately removed). What must be true for it to work: a pre-launch B2B product needs (a) a lead path that works and (b) trust. (a) is currently half-broken (Finding C1).

## 3. Website Classification

**Hybrid product + marketing site** with a **lead-generation** job (waitlist + talk-to-team). Classified correctly in the build; no misclassification finding. The "hybrid" half is unmet: nothing on the site yet fronts the real product (no login, no demo beyond a scripted illustrative widget, which is clearly labelled as illustrative).

## 4. Information Architecture & Sitemap

| Check | Result |
|---|---|
| Routes (8): `/` `/product` `/solutions` `/docs` `/company` `/security` `/waitlist` `/talk-to-team` | Verified. All reachable in ≤2 clicks from nav. |
| Navigation labels | Plain language; no jargon. Verified. |
| Footer carries utility load | Product / Company / Get started columns. **No Legal column** (no privacy, terms, cookies). |
| Utility pages | `sitemap.xml` ✓ `robots.txt` ✓ · **custom 404 ✗** (see M1) · accessibility statement ✗ |
| Missing universal-sitemap categories | Legal; Blog/Resources; Case studies (cannot honestly exist yet). |
| `/docs` | 9 of ~40 listed sections have content; the rest honestly say "coming soon". |

## 5. User Journeys

| Journey | End-to-end completable? |
|---|---|
| Visitor → Waitlist | **Yes** (Verified in code + tests; I did not submit a live form because it would send real mail). Confirmation state exists. |
| Visitor → Talk to the team | **No on production** (Verified endpoint: 405). Error state would show "Something went wrong" (Inferred from code). Failure path is *designed* but the happy path is unreachable. |
| Search/organic landing on a deep page | Works: prerendered, correct title/h1/canonical per route (Verified, raw HTML, no JS). |
| Social share of any page | Degraded: no `og:image` on any page (M6). |
| Return visitor | No way to measure (H1). |

Failure/permission/offline paths: not designed or tested beyond form error states.

## 6. Page-by-Page Audit (live, raw HTML, no JS)

| Page | h1 | h2 | Words | Canonical | JSON-LD | Notes |
|---|---|---|---|---|---|---|
| `/` | 1 | many | 1,164 | ✓ `…/` | 2 | Strong; hero → proof sections → CTA |
| `/product` | 1 | 3 | 443 | `…/product` | 2 | Redirects to `/product/` (M2) |
| `/solutions` | 1 | 2 | 307 | ✓ | 1 | Segment pages "in progress", honestly labelled |
| `/docs` | 1 | 0 | 303 | ✓ | 1 | Thin by design (shell) |
| `/company` | 1 | 4 | 391 | ✓ | 2 | Real roster; Organization+founder schema |
| `/security` | 1 | 2 | 346 | ✓ | 1 | Describes verified architecture; no certifications claimed |
| `/waitlist` | 1 | 0 | 189 | ✓ | 1 | Form page; fine |
| `/talk-to-team` | 1 | 0 | 178 | ✓ | 1 | Form page; **cannot submit** (C1) |

Exactly one h1 per page everywhere (Verified). No `<img>` tags (all graphics are inline SVG/CSS), so alt-text findings do not apply.

## 7. UX Audit

- **Strengths (Verified):** consistent button/link patterns, restrained motion with `prefers-reduced-motion` honoured, clear form validation and error text (`role="alert"` on both forms), mobile layout verified in earlier passes.
- **P1:** C1 (a primary CTA leads to a dead end).
- **P2:** no skip link; sticky header with no `scroll-margin-top` (in-page anchors such as `/product#quality-intelligence` likely land under the header; **Inferred**, needs a manual check).

## 8. Content & Copy Audit

Headlines lead with the customer's problem ("Your quality system already exists. It's just hiding."). Claims are specific and sourced to real behaviour (lifecycle states from the real data model; security claims from the real codebase). No invented metrics, clients or testimonials: this is correct and rare. **Gap:** no trust signals of any kind (none can honestly exist pre-launch), and no explanation of what happens to submitted data (H2).

## 9. SEO Audit

**Technical (Verified):** prerendered per-route `<title>`, description, canonical, OG/Twitter text and JSON-LD present in raw HTML (a non-JS crawler sees real content: the framework's "JavaScript rendering" check passes); robots + 8-URL sitemap present and on the correct domain; HTTPS enforced; one h1 per page; Organization / SoftwareApplication / founder schema with no invented fields.

**Canonical domain: PASS.** Everything (HTML, sitemap, robots, JSON-LD) consistently says `qualitracker.com`, which is the domain GitHub Pages actually serves with HTTPS enforced. `qualitracker.co` and `.org` do not resolve. (This also corrects my earlier change to `.co`, which was wrong; see L5.)

**Findings:** M1 no custom 404 · M2 canonical redirects (trailing slash) · M6 no `og:image` · L3 sitemap has no `<lastmod>`.
**Content SEO:** keyword/intent mapping and content depth beyond marketing pages is **Unscored**: no keyword research has been done and I will not invent search volumes.

## 10. Performance (Core Web Vitals)

**Field data (CrUX): Unscored.** Needs real traffic and Search Console / CrUX access. All numbers below are lab only.

| Page (live) | Perf | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` | 86 | 3.2s (Needs Improvement) | 3.2s | 0 | 0 |
| `/product/` | **70** | **4.5s (Poor, >4.0s)** | 4.5s | 0 | 0 |
| `/waitlist/` | 90 | 2.9s | 2.8s | 0 | 0 |
| `/talk-to-team/` | 90 | 2.9s | 2.8s | 0 | 0 |

INP can't be measured in a lab run (TBT 0 is a proxy only). **Root cause for `/product` (Verified in the Lighthouse trace):** render-blocking Google Fonts stylesheet, ~2.5s of delay. The source `index.html` correctly uses preload-then-activate, but the prerender captures the DOM *after* the `onload` handler has flipped `rel="preload"` → `rel="stylesheet"`, so **every prerendered page ships the blocking version** (Verified: `dist/public/product/index.html` contains `rel="stylesheet" as="style"`). This regressed an earlier fix and was introduced by the prerender step. Also: ~70 KiB unused JS on `/` and `/product` (the shared graph/motion chunk).

Per 30 Performance: no performance budget has ever been set (only after-the-fact measurements). That is a process finding (M-level): add budgets to CI.

## 11. Accessibility (WCAG 2.2 AA)

- **Automated (Verified):** Lighthouse accessibility 100 on all four live pages tested. This covers only a subset of WCAG; it is not a conformance claim.
- **Verified present:** keyboard-focusable controls, visible `:focus-visible` outline, `prefers-reduced-motion` in CSS and JS, one h1/page, `lang="en"`, landmarks (`<header>`, `<nav aria-label>`, `<main>`), form errors announced via `role="alert"`, labels wrapping inputs, `aria-expanded` on the mobile menu button.
- **Verified failing:** **no skip-navigation link** (WCAG 2.4.1, Level A).
- **Inferred, needs manual verification:** 2.4.11 Focus Not Obscured (sticky header, no scroll-margin) · 2.5.8 Target Size (24×24) for small footer/technical-label controls · 3.3.8 Accessible Authentication (n/a: no login) · 3.2.6 Consistent Help (no help mechanism exists).
- **Not performed:** manual screen-reader pass, keyboard-only walkthrough, zoom/reflow at 400%, forced-colors. **Unscored beyond "automated pass + one known Level A failure".**

## 12. Security Basics

| Check | Result |
|---|---|
| HTTPS enforced, http→https 301 | ✓ Verified |
| Mixed content | None observed |
| `Strict-Transport-Security` | ✗ absent (Verified headers) |
| `Content-Security-Policy` | ✗ absent (no header, no meta) |
| `X-Frame-Options` / `frame-ancestors` | ✗ absent (clickjacking possible) |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | ✗ absent |
| Secrets in client JS | No secrets, but EmailJS **service ID, template ID and public key are in the bundle** (by EmailJS design; see H4) |
| Third-party scripts | Only Google Fonts (CSS) and the EmailJS API call: a small surface (good) |
| Forms protected against bots | Honeypot only; no rate limit / CAPTCHA (H4) |
| Cookie/privacy notice | None (H2); note no cookies are set by the site itself |
| Dependencies | `pnpm audit --prod`: 3 advisories (1 critical `proxy-addr`, 2 moderate `qs`), **all in `artifacts/api-server`'s Express, which is not deployed to Pages** (Verified: Pages workflow publishes only `dist/public`). Real but not exploitable in production; the dead server should be removed or upgraded (L1). |

GitHub Pages cannot set response headers; closing M3 needs a CDN/proxy in front (e.g. Cloudflare) or a meta-CSP subset.

## 13. Conversion Audit

- **CTA hierarchy:** Primary = "Join the waitlist" (gold, hero, nav, end of every page): clear. Secondary = "Talk to the team": clear, **but broken** (C1). Tertiary = none (no newsletter; `newsletter` and `demo_request` kinds exist in code but have no UI and no backend).
- **Form friction:** waitlist requires 7 fields including free-text expectations: high for a pre-launch lead form (each field costs conversions). Recommend A/B test of a 3-field version rather than assume.
- **Trust signals:** none (cannot honestly exist yet). Objection handling: security page is strong; **no privacy reassurance at the point of data entry**.
- **Cannot be measured** (H1): no analytics, no conversion tracking, no UTM capture reaches the waitlist path (UTMs are only attached on the broken `/api/leads` path; the EmailJS path drops source/UTM data entirely).

## 14. Analytics & Measurement

**Verified absent:** no GA4/GTM/Plausible/Segment/PostHog/Hotjar/Clarity/Umami in the page source; no error monitoring. No events, no funnel, no dashboard. Search Console status unknown (Unscored: needs access).

## 15. Competitive Intelligence

**Not performed.** The framework requires 3–5 real, named competitors researched via search; I did not do that research in this pass and will not invent any. Needed: a research pass (e.g. other lab QMS vendors active in East Africa) before any "differentiate / adopt / avoid" claims. Graphify was compared earlier as a *design benchmark* only (`20_GRAPHIFY_COMPARISON_POST_IMPLEMENTATION.md`), not as a market competitor.

## 16. Severity-Tagged Findings

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| C1 | **CRITICAL** | "Talk to the team" form cannot submit in production; it POSTs to `/api/leads`, which returns 405 on GitHub Pages | `curl -X POST https://qualitracker.com/api/leads` → `405 Not Allowed`; `talk-to-team-page.tsx` calls `submitLead({kind:'talk_to_team'})`; `leads.ts` routes every non-waitlist kind to `/api/leads` |
| H1 | HIGH | No analytics or error monitoring; failures like C1 are invisible, conversion is unmeasurable | Page source scan; no tooling in repo |
| H2 | HIGH | Personal data (name, email, org, role) collected and sent to a third-party processor (EmailJS) with no privacy notice, policy, terms or consent capture; `consent: true` is hard-coded in both forms | `leads.ts`, `waitlist-page.tsx:46`, `talk-to-team-page.tsx:52`; no privacy/terms route. *Applicable law (e.g. Tanzania PDPA, GDPR for EU visitors) needs counsel; I'm not asserting a specific violation.* |
| H3 | HIGH | Prerender re-activates render-blocking Google Fonts on every prerendered page; `/product` LCP 4.5s (Poor) | Lighthouse (live) render-blocking-insight 2,495 ms; `dist/public/product/index.html` has `rel="stylesheet" as="style"` |
| H4 | HIGH | Waitlist is open to scripted abuse: EmailJS IDs + key in the public bundle, honeypot-only protection, no rate limit/CAPTCHA, so spam can reach the team inbox or exhaust quota | `leads.ts` L33-46 (Inferred exploitability; depends on EmailJS dashboard domain/rate settings, which I did not inspect) |
| M1 | MED | No custom 404; unknown URLs show the generic "GitHub Pages" page, so the app's own NotFound is unreachable | live `/this-does-not-exist` → 404, `<title>Page not found · GitHub Pages</title>`; no `404.html` in build |
| M2 | MED | Canonical URLs redirect: declared `…/product` but host 301s to `…/product/` (all 7 non-root routes) | `curl -L` redirects=1; canonical text |
| M3 | MED | No security headers (CSP/HSTS/XFO/Referrer-Policy/Permissions-Policy) | `curl -I` |
| M4 | MED | No skip-navigation link (WCAG 2.4.1 Level A); sticky header without `scroll-margin` (Focus Not Obscured, Inferred) | source scan |
| M5 | MED | Accessibility assurance is automated-only; no manual SR/keyboard pass; no a11y tests in CI | repo test inventory |
| M6 | MED | No `og:image` while `twitter:card=summary_large_image`, so shared links preview with no image | live HTML |
| M7 | MED | `main` auto-deploys to production with no branch protection, no PR requirement, no preview env (CI on `dev`/PRs added 2026-10-18: partial) | `static.yml`, branch API |
| M8 | MED | 14 tests (11 vitest + 3 node:test); no E2E, a11y, visual-regression or performance tests; nothing would have caught C1 or H3 | repo test inventory |
| L1 | LOW | 3 advisories (1 critical, 2 moderate) in the undeployed `artifacts/api-server`; also dead `/api/leads` server and `.replit` config remain | `pnpm audit --prod` |
| L2 | LOW | ~70 KiB unused JS on `/` and `/product`; shared chunk is misleadingly named `structured-data-*.js` | Lighthouse |
| L3 | LOW | Sitemap lacks `<lastmod>`; `/docs` mostly "coming soon" (honest) | sitemap |
| L4 | LOW | History of three canonical domains (`.org` → `.co` → `.com`) lingers in `docs/website/*.md` | repo grep |
| L5 | LOW | My earlier change of the canonical to `.co` (on your instruction) conflicted with the live `.com`; the team's `.com` is correct | Pages CNAME + HTTP 200 on `.com` only |
| O1 | OPP | Privacy-friendly analytics + core events (`cta_click`, `form_submit`, `form_error`) + error monitoring | n/a |
| O2 | OPP | Competitor research pass (framework §14) | n/a |
| O3 | OPP | Field CWV via Search Console/CrUX once traffic exists | n/a |
| O4 | OPP | Real case studies/testimonials *when real ones exist*; blog/resources for E-E-A-T | n/a |

## 17. Scorecards

### Website rubric (/10, evidence-based)

| Category | Score | Basis |
|---|---|---|
| Positioning & Messaging | 8 | Clear, specific, honest; no proof points possible yet |
| Information Architecture | 7 | Clean and shallow; no legal/404/blog |
| UX | 6 | Strong patterns; one primary CTA dead-ends (C1); no skip link |
| UI / Visual Design | 8 | Distinctive, consistent, brand-true |
| Content Quality | 7 | Specific and truthful; thin supporting content (by stage) |
| Technical SEO | 7 | Prerender + per-route meta + schema ✓; M1/M2/M6 open |
| Performance | 6 | Lab: 70–90; `/product` Poor LCP; root cause identified (H3); no field data |
| Accessibility | 6 | Automated 100, one Level A failure, manual pass not done: *provisional* |
| Security | 4 | HTTPS ✓, tiny script surface ✓; no headers, form abuse exposure, no privacy |
| Conversion Optimization | 4 | Primary CTA works; secondary broken; no measurement; no reassurance |
| Analytics Maturity | 1 | Verified absent |
| Competitive Intelligence | **Unscored** | Not researched |
| Core Web Vitals (field) | **Unscored** | Needs CrUX/Search Console |

### Product Quality Scorecard (36) — /100, website scope only

Scored where there is evidence; the rest are left Unscored rather than estimated.

| Category | Score | Basis / what's needed |
|---|---|---|
| Product clarity | 80 | Clear offer, honest staging |
| UX | 60 | See above |
| UI | 80 | |
| Creative direction | 80 | Distinctive and restrained |
| Brand differentiation | **Unscored** | Needs competitor research |
| Accessibility | 55 | Provisional (automated only) |
| Architecture | 70 | Sound static prerender + workspace; dead api-server and Replit leftovers |
| Code quality | 70 | Typed, linted, consistent; tokens + components; few tests |
| Documentation | 75 | Extensive decision log in `docs/`; no README-level onboarding verified |
| Security | 40 | See §12 |
| Performance | 55 | See §10 |
| Reliability | 40 | Primary conversion path partially broken in prod; no monitoring |
| Testing | 35 | 14 tests, no E2E/a11y/visual |
| Observability | 10 | Verified none |
| AI quality | **Unscored** | The only AI surface is a scripted, labelled demo; real QualiBOT not on this site |
| Data architecture | **Unscored** | Site stores no data; leads go to email only (no CRM/DB: itself a finding for follow-up handling) |
| Developer experience | 65 | pnpm workspace, CI now on `dev`; Replit leftovers; two test runners |
| Scalability / Maintainability / Innovation | **Unscored** | No basis yet |

**Scorecard rule triggered:** *Observability (10), Testing (35), Security (40), Reliability (40)* sit far below the 70–80 on clarity/UI/creative: exactly the "polish masking weak engineering" pattern the scorecard exists to flag. They need their own focused review, not an average.

## 18. Prioritized Roadmap

**First 30 days (stop the bleeding)**
1. C1: make Talk-to-the-team work (route it through the same EmailJS path as the waitlist, or Formspree/Cloudflare Worker; interim: replace the form with a `mailto:` until it works).
2. H3: restore `rel="preload"` for the fonts link in the prerender output.
3. H2: privacy notice at both forms + `/privacy` and `/terms` pages linked from the footer; capture consent from an actual checkbox; counsel review.
4. H1: analytics + `cta_click` / `form_submit` / `form_error` events; error monitoring on form failures.
5. H4: restrict the EmailJS key to the production domain and set rate limits in the EmailJS dashboard; add Cloudflare Turnstile.
6. M1/M2/M4/M6: emit `404.html`, align canonical/sitemap with the trailing-slash URLs, add a skip link and `scroll-margin-top`, add an `og:image`.

**60 days (raise the floor)**
7. M3: put Cloudflare (or similar) in front for security headers; add CSP.
8. M5/M8: Playwright journey tests (waitlist, talk-to-team against a preview), axe-core in CI, performance budget check in CI (LCP/JS size), manual keyboard + screen-reader pass.
9. M7: ask the repo admin to protect `main` (PR + passing CI); add per-PR preview deploys.
10. L1/L2: delete the dead `api-server` + Replit config, or upgrade; trim the shared JS chunk.

**90 days (grow)**
11. O2: competitor research, then differentiation work. O3: field CWV review once traffic exists. O4: real case studies as they exist; blog/resources for content SEO. Decide a destination for leads beyond email (CRM/DB) and follow-up SLAs.

## 19. Quick Wins (top 10)

1. Fix the fonts `<link>` in prerender output (~10 lines; recovers ~2.5s of render blocking on every route).
2. Replace the broken Talk-to-team submit path (or add an interim `mailto:`).
3. Add a one-line privacy notice with link at both forms; stop hard-coding `consent: true`.
4. Emit `404.html` from the prerender (render NotFound once).
5. Add a skip link (`<a href="#main">`) and `scroll-margin-top` for the sticky header.
6. Make canonical + sitemap URLs match the served trailing-slash URLs.
7. Add one `og:image` (1200×630).
8. Add privacy-friendly analytics and three events.
9. EmailJS dashboard: domain allowlist + rate limit.
10. Remove `artifacts/api-server` and `.replit` from the repo (or upgrade Express deps).

## 20. Final Recommendation & North Star

The brand, copy and engineering craft are ahead of the operational basics. **Fix the conversion path and measurement first**: a site whose second CTA silently fails and which cannot see its own funnel is not yet doing its job, however good it looks (17 Website Standard: creativity must not outrun usability). Then close the legal/security hygiene gaps. North star: *every visitor who wants to reach the team or join the waitlist can, we know when they do, and we tell them what happens to their data.*

## 21. Standards & Sources Referenced

Core Web Vitals thresholds (LCP ≤2.5s / INP ≤200ms / CLS ≤0.1; web.dev) and WCAG 2.2 AA as stated in the supplied framework documents; OWASP Top 10:2025 categories as cited in the supplied WebApp framework. Re-verify current versions before relying on them externally.

### Not inspected (to complete this audit)
- CrUX / Search Console field data and indexing status
- EmailJS dashboard (domain restrictions, rate limits, where leads actually land)
- Manual WCAG 2.2 pass (keyboard-only, screen reader, 400% zoom, target sizes)
- Competitor research (framework §14)
- A real end-to-end form submission (would send real email; recommend doing it against a test EmailJS template)

---

## Remediation status (added same day, on `dev`)

Fixed on the `dev` branch and verified locally (typecheck, lint, 20 vitest + 7 node:test, full build with prerender, and inspection of the built HTML). **None of this is verified in production until `dev` is merged and deployed**, so re-run the live checks in this report after the merge.

| Finding | Status | What changed |
|---|---|---|
| C1 Talk-to-team dead end | **Fixed on dev (interim)** | Routed through EmailJS like the waitlist; regression test asserts it never calls `/api/leads`. **Interim:** shares the waitlist template, so the email subject says "Waitlist"; create a dedicated template (see `docs/WAITLIST_EMAIL_SETUP.md`). Live delivery still unverified. |
| H2 Privacy / consent | **Partly fixed** | `/privacy` page (plain-language, strictly from what the code does, marked *draft pending legal review*); footer link; required consent checkbox on both forms; `consent` is no longer hard-coded. **Still needed:** legal review, Terms. |
| H3 Fonts regression | **Fixed on dev** | Prerender restores `rel="preload"`; verified in built HTML. Re-measure LCP on live after deploy. |
| M1 No 404 | **Fixed on dev** | `404.html` rendered from the real NotFound page. |
| M2 Canonical redirects | **Fixed on dev** | Canonicals, og:url, sitemap and company JSON-LD use the trailing-slash URLs the host serves. |
| M4 Skip link / scroll offset | **Fixed on dev** | Skip link + `#main` target; `scroll-padding-top` for the sticky header. Manual keyboard check still owed. |
| M6 og:image | **Fixed on dev** | 1200x630 brand card (`public/og-image.png`) + og/twitter image tags. |
| M8 Tests | Partly | +4 vitest, +2 node:test (talk-to-team path, consent, privacy page). Still no E2E / a11y / visual tests. |
| H1 Analytics | **Open** | Needs a vendor + consent decision. |
| H4 Waitlist abuse | **Open** | EmailJS dashboard (domain allowlist, rate limit) + CAPTCHA; not a code-only change. |
| M3 Security headers | **Open** | Needs a CDN/proxy in front of Pages. |
| L1 api-server | **Fixed on dev** | `artifacts/api-server` deleted, lockfile refreshed; `pnpm audit --prod` is clean. The dead `/api/leads` code path in `leads.ts` is gone too. Orphaned libs (`lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`) and `.replit` remain; remove separately. |
| Book a demo (new) | **Added on dev** | `/book-demo` request form (date, backup date, time window, time zone) emails info@qualitracker.com via EmailJS; team confirms by replying. Not a live-availability booking. Shares the waitlist template until a dedicated one is created (see `docs/WAITLIST_EMAIL_SETUP.md`). Privacy notice updated. |
| M5, M7, L2 | **Open** | Manual a11y pass; branch protection (repo admin); trim JS chunk. |
