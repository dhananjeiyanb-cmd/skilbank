import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { syncDocToSupabase, deleteDocFromSupabase, isSupabaseConfigured } from './supabase';

/**
 * Converts JS values into Firestore-safe values.
 * Firestore cannot store:
 *  - `undefined`   -> converted to `null` (recursively skipped/cleaned)
 *  - `NaN`         -> converted to `null`
 *  - +/- Infinity  -> converted to `null`
 *  - BigInt        -> converted to null if unsafe
 * These conversions prevent a single bad value from silently failing an
 * entire document write (Firestore rejects the whole write otherwise).
 */
function sanitizeForFirestore<T>(data: T): T {
  return sanitizeValue(data, new Set()) as T;
}

function sanitizeValue(value: any, seen: Set<object>): any {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'number') {
    // NaN and Infinity are NOT valid Firestore values.
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  if (Array.isArray(value)) {
    const out: any[] = [];
    for (const item of value) {
      if (item === undefined) continue;
      out.push(sanitizeValue(item, seen));
    }
    return out;
  }
  if (value instanceof Date) {
    return value; // Firestore timestamps are natively supported
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      // Circular reference — drop it to avoid an infinite loop.
      return null;
    }
    seen.add(value);
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const val = value[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeValue(val, seen);
      }
    }
    seen.delete(value);
    return cleaned;
  }
  return value;
}

/**
 * WHY THIS QUEUE IS DURABLE (and lives in localStorage, not memory):
 * -------------------------------------------------------------------
 * Firestore free-tier projects have a daily read/write quota. Once the daily
 * quota is exhausted every write returns `resource-exhausted`, and previously
 * this queue lived only in browser memory — so any page refresh permanently
 * dropped every unsynced change and the records never reached the database.
 *
 * Now failed/queued writes are persisted to localStorage on this device and
 * automatically retried (latest value per document wins), so records reach
 * the cloud database as soon as Firestore accepts writes again (e.g. after
 * the daily free-tier quota reset at 00:00 US-Pacific / 07:00 UTC).
 */

const QUEUE_STORAGE_KEY = 'hod_task_system_v3_pending_firestore_ops_v1';

interface PendingOp {
  kind: 'write' | 'delete';
  collection: string;
  docId: string;
  data?: any;
}

// Cap the queue to avoid unbounded growth in localStorage.
const MAX_PENDING_OPS = 1000;
// Batch of ops flushed per retry tick (keeps each API call small).
const MAX_OPS_PER_FLUSH = 100;
const INITIAL_BACKOFF_MS = 8000;
// After a Firestore quota/resource-exhausted error we back off harder (60s)
// so the device does not hammer the exhausted database all day.
const QUOTA_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 15 * 60_000;

let pendingOps: PendingOp[] = [];
let retryTimer: any = null;
let flushing = false;
let backoffMs = INITIAL_BACKOFF_MS;
let lastErrorCode: string | null = null;
let lastErrorAt: number | null = null;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function loadQueue(): PendingOp[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const saved = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn('[firestoreSync] Could not parse stored pending-sync queue:', err);
  }
  return [];
}

function saveQueue(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(pendingOps));
  } catch (err) {
    // localStorage is full — drop the oldest ops until it fits.
    console.warn('[syncDocToFirestore] Local pending queue is full; dropping oldest ops.', err);
    while (pendingOps.length > 1) {
      pendingOps.shift();
      try {
        window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(pendingOps));
        break;
      } catch {
        /* keep dropping until it fits */
      }
    }
  }
}

function opKey(collection: string, docId: string): string {
  return `${collection}/${docId}`;
}

/**
 * Insert (or replace) an op. Repeated writes to the same document only keep
 * the LATEST payload — this keeps the queue small and never writes stale
 * intermediate values once the cloud database comes back online.
 *  - a new write replaces an older pending write of the same doc
 *  - a delete removes any pending write of the same doc
 */
function dedupInsert(op: PendingOp): void {
  const key = opKey(op.collection, op.docId);
  if (op.kind === 'delete') {
    pendingOps = pendingOps.filter((p) => opKey(p.collection, p.docId) !== key);
  } else {
    const existing = pendingOps.find(
      (p) => p.kind === 'write' && opKey(p.collection, p.docId) === key
    );
    if (existing) {
      existing.data = op.data;
      return;
    }
  }
  if (pendingOps.length >= MAX_PENDING_OPS) {
    pendingOps.shift();
  }
  pendingOps.push(op);
}
/* ------------------------------------------------------------------ */
/* Retry scheduling                                                    */
/* ------------------------------------------------------------------ */

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

function isQuotaError(error: any): boolean {
  const code = error?.code;
  const msg = typeof error?.message === 'string' ? error.message : String(error?.message ?? '');
  return (
    code === 'resource-exhausted' ||
    code === 'RESOURCE_EXHAUSTED' ||
    code === 'quota-exceeded' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Resource exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED')
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
  dedupInsert(op);
  backoffMs = backoffMs > INITIAL_BACKOFF_MS ? backoffMs : INITIAL_BACKOFF_MS;
  if (op.kind === 'write') {
    console.warn(
      `[syncDocToFirestore] Firestore temporarily unavailable for "${op.collection}/${op.docId}" — queued for automatic retry (${pendingOps.length} op(s) pending).`
    );
  }
  saveQueue();
  scheduleRetry();
}

/**
 * Process the durable retry queue. Writes are safe to re-run repeatedly
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
        lastErrorCode = null;
        lastErrorAt = null;
        backoffMs = INITIAL_BACKOFF_MS;
      } catch (error: any) {
        if (isTransientError(error)) {
          if (isQuotaError(error)) {
            lastErrorCode = error?.code || 'resource-exhausted';
            lastErrorAt = Date.now();
            backoffMs = QUOTA_BACKOFF_MS;
          } else {
            backoffMs = Math.min(Math.max(backoffMs * 2, INITIAL_BACKOFF_MS), MAX_BACKOFF_MS);
          }
          scheduleRetry();
          break;
        }
        pendingOps.shift();
        lastErrorCode = error?.code || null;
        lastErrorAt = Date.now();
        handleFirestoreError(error, op.kind === 'write' ? OperationType.WRITE : OperationType.DELETE, `${op.collection}/${op.docId}`);
      }
      processed += 1;
    }

    if (pendingOps.length > 0 && retryTimer === null) {
      scheduleRetry();
    }
    saveQueue();
  } finally {
    flushing = false;
  }
}

/**
 * Kick off a flush shortly after the module loads (for durable queue entries
 * that were persisted by a previous page session), and whenever the browser
 * regains connectivity / the tab is shown again.
 */
function bootDurableQueue(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    const queued = loadQueue();
    if (queued.length > 0) {
      if (pendingOps.length === 0) {
        pendingOps = queued;
      }
      console.log(`[syncDocToFirestore] Resumed ${pendingOps.length} pending cloud-sync op(s) from previous session.`);
      window.setTimeout(() => void processPendingOps(), 5000);
    }
  } catch (err) {
    console.warn('[syncDocToFirestore] Failed to resume durable queue:', err);
  }
  window.addEventListener('online', () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    void processPendingOps();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void processPendingOps();
    }
  });
}
/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

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
    if (flushing === false && pendingOps.length === 0) {
      lastErrorCode = null;
      lastErrorAt = null;
    }
  } catch (error: any) {
    if (isTransientError(error)) {
      enqueueRetry({ kind: 'write', collection: collectionName, docId: cleanId, data });
    } else {
      lastErrorCode = error?.code || null;
      lastErrorAt = Date.now();
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
      enqueueRetry({ kind: 'delete', collection: collectionName, docId: cleanId });
    } else {
      lastErrorCode = error?.code || null;
      lastErrorAt = Date.now();
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

/**
 * Number of writes/deletes still waiting to reach the cloud database.
 * Surface this in the UI so staff know when the app is catching up.
 */
export function getPendingFirestoreSyncCount(): number {
  return pendingOps.length;
}

/** Detailed sync status for the UI (pending count + last error, if any). */
export interface FirestoreSyncStatusInfo {
  pendingCount: number;
  lastErrorCode: string | null;
  lastErrorAt: number | null;
  isFlushing: boolean;
}

export function getFirestoreSyncStatus(): FirestoreSyncStatusInfo {
  return {
    pendingCount: pendingOps.length,
    lastErrorCode,
    lastErrorAt,
    isFlushing: flushing,
  };
}

/** Force an immediate attempt to flush the durable queue. */
export function flushPendingFirestoreSync(): void {
  void processPendingOps();
}

/**
 * Called once on app start to resume any durable queue left over from a
 * previous session. Kept as an explicit init so the module stays safe to
 * import in non-browser contexts.
 */
export function initFirestoreDurableQueue(): void {
  bootDurableQueue();
}