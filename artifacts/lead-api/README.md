# lead-api

Cloud Run function (`submitLead`, region `africa-south1`) behind the website's three forms. Not deployed yet: see `docs/website/23_GCP_SETUP_RUNBOOK.md`, section 6.

**Flow:** origin/size/content-type checks → honeypot → validation → rate limit (salted hashes only) → **save to Firestore** → email the team through Gmail (Workspace domain-wide delegation, keyless) with Reply-To = visitor → `200`. Mail failure is logged at `ERROR` and flagged on the record; it does not fail the request.

| Env var | Required | Default | Meaning |
|---|---|---|---|
| `HASH_SALT` | yes (16+ chars) | none, fails at startup | HMAC salt for IP/email rate-limit keys (Secret Manager) |
| `MAIL_SENDER` | no | `info@qualitracker.com` | Workspace user the function sends as |
| `MAIL_TO` | no | `info@qualitracker.com` | Recipient |
| `ALLOWED_ORIGINS` | no | `https://qualitracker.com,https://www.qualitracker.com` | CORS allow-list (comma separated) |
| `ALLOWED_ORIGIN_REGEX` | no | Firebase preview channels of this project | Extra origin pattern |
| `RETENTION_DAYS` | no | `730` **(placeholder, decide with legal)** | Sets each lead's `expireAt` (Firestore TTL deletes it) |
| `NOTICE_VERSION` | no | `privacy-draft-2026-10` | Recorded with each consent |

```bash
pnpm --filter @workspace/lead-api test        # 28 unit tests, no network or credentials needed
pnpm --filter @workspace/lead-api build       # same tsc step Cloud Build runs (gcp-build)
```

Logs contain lead IDs and counts only, never names, emails or message text.
