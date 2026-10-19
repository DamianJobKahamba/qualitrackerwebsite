import { http } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { createHandler, type Config, type Deps, type HttpReq, type HttpRes } from './handler.ts';
import { createGmailMailer } from './mail.ts';
import { DEFAULT_LIMITS } from './ratelimit.ts';
import { createFirestoreStore } from './store.ts';

function loadConfig(env: NodeJS.ProcessEnv): Config {
  const hashSalt = env.HASH_SALT;
  if (!hashSalt || hashSalt.length < 16) {
    // Fail closed at startup rather than hash IPs/emails with a guessable salt.
    throw new Error('HASH_SALT must be set (16+ chars). Store it in Secret Manager and mount it as an env var.');
  }
  const retentionDays = Number(env.RETENTION_DAYS ?? 730);
  if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error('RETENTION_DAYS must be a positive integer');
  return {
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'https://qualitracker.com,https://www.qualitracker.com')
      .split(',').map((s) => s.trim()).filter(Boolean),
    // Firebase Hosting preview channels look like https://<project>--<channel>-<hash>.web.app
    allowedOriginPattern: new RegExp(env.ALLOWED_ORIGIN_REGEX ?? '^https://qualitracker-website-e6c53--[a-z0-9-]+\\.web\\.app$'),
    mailTo: env.MAIL_TO ?? 'info@qualitracker.com',
    // The mailbox the function impersonates (must be a real Workspace user). Change this one
    // setting to move to a dedicated sender address.
    mailSender: env.MAIL_SENDER ?? 'info@qualitracker.com',
    hashSalt,
    // PLACEHOLDER retention (24 months). The real period is a team/legal decision and must match /privacy.
    retentionDays,
    noticeVersion: env.NOTICE_VERSION ?? 'privacy-draft-2026-10',
    limits: DEFAULT_LIMITS,
    storeTimeoutMs: 6000,
  };
}

function log(severity: 'INFO' | 'WARNING' | 'ERROR', message: string, fields: Record<string, unknown> = {}) {
  // One JSON line: Cloud Logging reads `severity` and `message`. Never put personal data in here.
  console.log(JSON.stringify({ severity, message, ...fields }));
}

const config = loadConfig(process.env);
const store = createFirestoreStore(new Firestore());
const deps: Deps = { store, mailer: createGmailMailer(config.mailSender), config, now: () => new Date(), log };
const handler = createHandler(deps);

http('submitLead', (req, res) => handler(req as unknown as HttpReq, res as unknown as HttpRes));
