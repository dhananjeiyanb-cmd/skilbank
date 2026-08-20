import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { syncDocToSupabase, deleteDocFromSupabase, isSupabaseConfigured } from './supabase';

/**
 * Converts JS values (including `undefined`) into Firestore-safe values.
 * Firestore cannot store `undefined`, so it is converted to `null` recursively.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const val = (data as Record<string, any>)[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * PROBLEM THAT WAS FIXED
 * -----------------------
 * The old implementation kept a module-level `isQuotaExceeded` flag. The first
 * time ANY write hit a Firestore quota / throttling error, that flag was flipped
 * to `true` for the rest of the browser session, and EVERY later write was
 * silently dropped (`if (isQuotaExceeded) return;`). With many HODs all saving
 * into the same Firestore project, the daily free-tier quota gets consumed
 * quickly — and then all HODs' data quietly stopped reaching Firebase and only
 * lived in their local browser storage.
 *
 * The new implementation NEVER permanently disables Firestore writes. Momentary
 * quota / throttling / network failures are queued in memory and retried
 * automatically with exponential backoff, so data still reaches the cloud as
 * soon as Firestore accepts it again.
 */

interface PendingOp {
  kind: 'write' | 'delete';
  collection: string;
  docId: string;
  data?: any;
}

// Cap the queue to avoid unbounded memory growth if Firestore is down for a long time.
const MAX_PENDING_OPS = 3000;
// Batch of ops flushed per retry tick (keeps each API call small).
const MAX_OPS_PER_FLUSH = 100;
const INITIAL_BACKOFF_MS = 4000;
const MAX_BACKOFF_MS = 60_000;

const pendingOps: PendingOp[] = [];
let retryTimer: any = null;
let flushing = false;
let backoffMs = INITIAL_BACKOFF_MS;

/**
 * Firestore returns these error shapes for transient quota/throttling/latency
 * conditions. They should be retried rather than treated as fatal.
 */
function isTransientError(error: any): boolean {
  const code = error?.code;
  const msg = typeof error?.message === 'string' ? error.message : String(error?.message ?? '');
  return (
    code === 'resource-exhausted' ||
    code === 'quota-exceeded' ||
    code === 'RESOURCE_EXHAUSTED' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'internal' ||
    code === 'network' ||
    code === 'aborted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Resource exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Rate limited') ||
    msg.includes('try again later')
  );
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processPendingOps();
  }, backoffMs);
}

function enqueueRetry(op: PendingOp): void {
  if (pendingOps.length >= MAX_PENDING_OPS) {
    pendingOps.shift();
    console.warn('[syncDocToFirestore] Pending-sync queue is full; dropping the oldest pending op to protect memory.');
  }
  pendingOps.push(op);
  scheduleRetry();
}

/**
 * Process the in-memory retry queue. Writes are safe to re-run repeatedly
 * because `setDoc(..., { merge: true })` is idempotent.
 */
async function processPendingOps(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let processed = 0;
    while (pendingOps.length > 0 && processed < MAX_OPS_PER_FLUSH) {
      const op = pendingOps[0];
      try {
        if (op.kind === 'write') {
          const sanitized = sanitizeForFirestore(op.data);
          await setDoc(doc(db, op.collection, op.docId), sanitized, { merge: true });
        } else {
          await deleteDoc(doc(db, op.collection, op.docId));
        }
        pendingOps.shift();
        backoffMs = INITIAL_BACKOFF_MS;
      } catch (error: any) {
        if (isTransientError(error)) {
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
          scheduleRetry();
          break;
        }
        pendingOps.shift();
        handleFirestoreError(error, op.kind === 'write' ? OperationType.WRITE : OperationType.DELETE, `${op.collection}/${op.docId}`);
      }
      processed += 1;
    }

    if (pendingOps.length > 0 && retryTimer === null) {
      scheduleRetry();
    }
  } finally {
    flushing = false;
  }
}

export async function syncDocToFirestore(collectionName: string, docId: string | number, data: any) {
  if (docId === undefined || docId === null) {
    console.warn(`[syncDocToFirestore] Skipping write: invalid docId for collection "${collectionName}"`);
    return;
  }
  const cleanId = String(docId).trim().replace(/\//g, '_');
  if (!cleanId) return;
  const path = `${collectionName}/${cleanId}`;

  // Dual-sync to Supabase if configured
  if (isSupabaseConfigured()) {
    const supabaseTable = collectionName === 'skillBankStudents' ? 'skill_bank_students' : (collectionName === 'mentorMappings' ? 'mentor_mappings' : (collectionName === 'departmentRankings' ? 'department_rankings' : collectionName));
    void syncDocToSupabase(supabaseTable, cleanId, data);
  }

  try {
    const sanitized = sanitizeForFirestore(data);
    await setDoc(doc(db, collectionName, cleanId), sanitized, { merge: true });
  } catch (error: any) {
    if (isTransientError(error)) {
      console.warn(`[syncDocToFirestore] Firestore temporarily unavailable for "${path}" — queued for automatic retry. ${pendingOps.length + 1} op(s) pending.`);
      enqueueRetry({ kind: 'write', collection: collectionName, docId: cleanId, data });
    } else {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteDocFromFirestore(collectionName: string, docId: string | number) {
  if (docId === undefined || docId === null) {
    console.warn(`[deleteDocFromFirestore] Skipping delete: invalid docId for collection "${collectionName}"`);
    return;
  }
  const cleanId = String(docId).trim().replace(/\//g, '_');
  if (!cleanId) return;
  const path = `${collectionName}/${cleanId}`;

  // Dual-sync deletion to Supabase if configured
  if (isSupabaseConfigured()) {
    const supabaseTable = collectionName === 'skillBankStudents' ? 'skill_bank_students' : (collectionName === 'mentorMappings' ? 'mentor_mappings' : (collectionName === 'departmentRankings' ? 'department_rankings' : collectionName));
    void deleteDocFromSupabase(supabaseTable, cleanId);
  }

  try {
    await deleteDoc(doc(db, collectionName, cleanId));
  } catch (error: any) {
    if (isTransientError(error)) {
      console.warn(`[deleteDocFromFirestore] Firestore temporarily unavailable for "${path}" — queued for automatic retry. ${pendingOps.length + 1} op(s) pending.`);
      enqueueRetry({ kind: 'delete', collection: collectionName, docId: cleanId });
    } else {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

/**
 * Number of writes/deletes still waiting to be retried and pushed to Firestore.
 * Useful to surface in the UI / logs so staff know when the app is catching up.
 */
export function getPendingFirestoreSyncCount(): number {
  return pendingOps.length;
}

/**
 * Force an immediate attempt to flush the retry queue (useful after a quota
 * window resets or the network comes back).
 */
export function flushPendingFirestoreSync(): void {
  void processPendingOps();
}
