import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
// NOTE: names come from orval's operation-based convention, not the
// OpenAPI component names. CreateLeadBody/CreateLeadResponse are the
// runtime zod validators (from api.ts); LeadCreated (unused here) is
// just the type-only interface matching the OpenAPI component name.
// See openapi.yaml for why the component is named differently.
import { CreateLeadBody, CreateLeadResponse } from "@workspace/api-zod";
import { getNewsletterProvider } from "../lib/newsletter-provider";
import { logger } from "../lib/logger";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router: IRouter = Router();

// Very small in-memory rate limiter: max 5 submissions per IP per
// 10-minute window. Good enough to blunt casual abuse; swap for a
// Redis-backed limiter (or express-rate-limit + a store) before this
// runs on more than one server instance.
const submissionsByIp = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionsByIp.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return timestamps.length > MAX_PER_WINDOW;
}

router.post("/leads", async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  // Honeypot: a hidden "website" field that real users never fill in.
  // Bots that auto-fill every field trip this.
  if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
    logger.warn({ ip }, "Honeypot triggered on /api/leads — silently dropping.");
    res.status(201).json({ id: "ignored", status: "new" }); // don't tip off the bot
    return;
  }

  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  if (input.kind === "newsletter" && !input.consent) {
    res.status(400).json({ error: "Consent is required to subscribe." });
    return;
  }

  // Duplicate check: same email + same kind already exists.
  const existing = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(and(eq(leadsTable.email, normalizedEmail), eq(leadsTable.kind, input.kind)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "You're already on the list." });
    return;
  }

  const [created] = await db
    .insert(leadsTable)
    .values({
      email: normalizedEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      institution: input.institution,
      role: input.role,
      country: input.country,
      organizationType: input.organizationType,
      message: input.message,
      kind: input.kind,
      source: input.source,
      landingPage: input.landingPage,
      referrer: input.referrer,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmTerm: input.utmTerm,
      utmContent: input.utmContent,
      consent: input.consent,
      consentTimestamp: input.consent ? new Date() : null,
    })
    .returning({ id: leadsTable.id });

  if (input.kind === "newsletter") {
    try {
      await getNewsletterProvider().subscribe({
        email: normalizedEmail,
        firstName: input.firstName,
      });
    } catch (err) {
      // The lead is already safely stored — a provider hiccup should
      // never turn into a lost lead. Log and move on.
      logger.error({ err, email: normalizedEmail }, "Newsletter provider subscribe failed");
    }
  }

  const response = CreateLeadResponse.parse({ id: created.id, status: "new" });
  res.status(201).json(response);
});

export default router;
