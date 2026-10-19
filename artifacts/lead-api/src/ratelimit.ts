import { createHmac } from 'node:crypto';

/** One counter per (bucket, key, time window), enforced atomically by the store. */
export interface Counter {
  /** Increments the counter for `id` and returns the new count. Expired windows start again at 1. */
  hit(id: string, windowSeconds: number, now: Date): Promise<number>;
}

export interface Limits {
  perIpPerHour: number;
  perEmailPerDay: number;
}

export const DEFAULT_LIMITS: Limits = { perIpPerHour: 5, perEmailPerDay: 3 };

/**
 * Keyed hash so rate-limit documents never contain a raw IP or email address.
 * Without a salt the hash of a low-entropy value (an IPv4 address) is trivially reversible,
 * which is why HASH_SALT is a secret in production.
 */
export function hashKey(salt: string, kind: 'ip' | 'email', value: string): string {
  return createHmac('sha256', salt).update(`${kind}:${value.toLowerCase()}`).digest('hex').slice(0, 32);
}

export type Verdict = { allowed: true } | { allowed: false; reason: 'ip' | 'email' };

export async function checkRate(
  counter: Counter,
  salt: string,
  ip: string,
  email: string,
  now: Date,
  limits: Limits = DEFAULT_LIMITS,
): Promise<Verdict> {
  const ipCount = await counter.hit(`ip-${hashKey(salt, 'ip', ip)}`, 3600, now);
  if (ipCount > limits.perIpPerHour) return { allowed: false, reason: 'ip' };
  const emailCount = await counter.hit(`em-${hashKey(salt, 'email', email)}`, 86_400, now);
  if (emailCount > limits.perEmailPerDay) return { allowed: false, reason: 'email' };
  return { allowed: true };
}
