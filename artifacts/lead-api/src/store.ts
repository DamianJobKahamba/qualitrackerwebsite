import { Firestore, Timestamp } from '@google-cloud/firestore';
import type { Counter } from './ratelimit.ts';
import type { Lead } from './validate.ts';

export interface LeadRecord extends Lead {
  consentNotice: string;
  ipHash: string;
}

export interface LeadStore {
  /** Persists the lead and returns its id. Throws if it could not be stored. */
  save(record: LeadRecord, now: Date, retentionDays: number): Promise<string>;
  markEmail(id: string, status: 'sent' | 'failed', error?: string): Promise<void>;
}

export function createFirestoreStore(db: Firestore): LeadStore & Counter {
  return {
    async save(record, now, retentionDays) {
      const ref = await db.collection('leads').add({
        ...record,
        consent: { given: true, at: Timestamp.fromDate(now), notice: record.consentNotice },
        status: 'new',
        emailStatus: 'pending',
        createdAt: Timestamp.fromDate(now),
        // Firestore TTL policy on `expireAt` deletes the document after the retention period.
        expireAt: Timestamp.fromMillis(now.getTime() + retentionDays * 86_400_000),
      });
      return ref.id;
    },

    async markEmail(id, status, error) {
      await db.collection('leads').doc(id).update({
        emailStatus: status,
        emailError: error ?? null,
        emailAttemptedAt: Timestamp.now(),
      });
    },

    async hit(id, windowSeconds, now) {
      const ref = db.collection('rate').doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data();
        const windowStart = data?.windowStart instanceof Timestamp ? data.windowStart.toMillis() : 0;
        const expired = now.getTime() - windowStart >= windowSeconds * 1000;
        const count = expired ? 1 : Number(data?.count ?? 0) + 1;
        tx.set(ref, {
          count,
          windowStart: expired ? Timestamp.fromDate(now) : data?.windowStart,
          // TTL policy on `expireAt` clears old counters automatically.
          expireAt: Timestamp.fromMillis((expired ? now.getTime() : windowStart) + windowSeconds * 1000 + 86_400_000),
        });
        return count;
      });
    },
  };
}
