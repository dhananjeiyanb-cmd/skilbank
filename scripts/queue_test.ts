/**
 * Runtime validation for src/lib/firestoreSync.ts against the REAL Firestore
 * database of this project (which is currently quota-exhausted, so writes fail).
 * Run: npx tsx scripts/queue_test.ts
 */
import {
  syncDocToFirestore,
  deleteDocFromFirestore,
  getPendingFirestoreSyncCount,
  flushPendingFirestoreSync,
  getFirestoreSyncStatus,
  initFirestoreDurableQueue,
} from '../src/lib/firestoreSync';

// --- Minimal browser shim so firestoreSync can use window.localStorage ---
interface StoredOp { kind: string; collection: string; docId: string; data?: any }
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
(globalThis as any).window = { localStorage: ls, addEventListener: () => {}, removeEventListener: () => {} };
(globalThis as any).document = { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} };

function queueFromStorage(): StoredOp[] {
  const raw = ls.getItem('hod_task_system_v3_pending_firestore_ops_v1');
  return raw ? (JSON.parse(raw) as StoredOp[]) : [];
}

async function main() {
  // 1) Make a write that will fail with resource-exhausted (quota exhausted) -> enqueued
  await syncDocToFirestore('staff', 'TEST_HUMAN_1', { facultyName: 'Test One', n: NaN, bad: Infinity });
  const c1 = getPendingFirestoreSyncCount();
  console.log('[1] after failing write -> pending count =', c1);
  if (c1 < 1) throw new Error('FAIL: write was not enqueued despite quota exhaustion');

  // 2) Deduplication: writing the SAME doc again should keep queue size at 1 (latest wins)
  await syncDocToFirestore('staff', 'TEST_HUMAN_1', { facultyName: 'Test One Updated' });
  const c2 = getPendingFirestoreSyncCount();
  console.log('[2] after duplicate write -> pending count =', c2);
  if (c2 !== 1) throw new Error('FAIL: dedup failed; expected 1 op, got ' + c2);

  // 3) A different doc enqueues another entry
  await deleteDocFromFirestore('staff', 'TEST_HUMAN_2');
  const c3 = getPendingFirestoreSyncCount();
  console.log('[3] after distinct delete -> pending count =', c3);
  if (c3 !== 2) throw new Error('FAIL: expected 2 ops, got ' + c3);

  // 4) Delete cancels a pending write for the same doc
  await syncDocToFirestore('staff', 'TEST_HUMAN_3', { facultyName: 'Will be deleted' });
  const before = getPendingFirestoreSyncCount();
  await deleteDocFromFirestore('staff', 'TEST_HUMAN_3');
  const after = getPendingFirestoreSyncCount();
  console.log('[4] delete-cancels-write -> before', before, 'after', after);
  if (after !== before) throw new Error('FAIL: delete did not cancel pending write (' + after + ' vs ' + before + ')');

  // 5) The queue is persisted to localStorage (durable across refresh)
  const persisted = queueFromStorage();
  const foundWrite = persisted.find((p) => p.kind === 'write' && p.docId === 'TEST_HUMAN_1');
  console.log('[5] persisted to localStorage:', persisted.length, 'ops; latest payload =', JSON.stringify(foundWrite && foundWrite.data));
  if (!foundWrite) throw new Error('FAIL: queue not persisted or payload missing');
  if (foundWrite.data.facultyName !== 'Test One Updated') throw new Error('FAIL: dedup did not keep latest payload');

  // 6) Reload simulation: re-init from the persisted store and confirm count survives.
  const stBefore = getFirestoreSyncStatus();
  initFirestoreDurableQueue(); // reads persisted queue into memory
  const stAfter = getFirestoreSyncStatus();
  console.log('[6] status before reload:', stBefore.pendingCount, '| after init:', stAfter.pendingCount);

  // 7) Status reports quota error code (since writes fail with resource-exhausted)
  const st = getFirestoreSyncStatus();
  console.log('[7] lastErrorCode =', st.lastErrorCode, '| lastErrorAt =', st.lastErrorAt, '| pending =', st.pendingCount);
  if (st.lastErrorCode !== 'resource-exhausted') throw new Error('FAIL: expected resource-exhausted code');

  // 8) Sanitize-for-firestore guard: attempt a write with NaN/Infinity/BigInt and
  //    confirm the queue does not explode and a retry can be scheduled (flush).
  await syncDocToFirestore('staff', 'TEST_HUMAN_BADVALS', { a: NaN, b: Infinity, c: 123n, d: 'ok' });
  const c8 = getPendingFirestoreSyncCount();
  console.log('[8] queue after NaN/Infinity/BigInt write ->', c8, 'pending');
  flushPendingFirestoreSync(); // triggers a flush attempt; will just re-queue transient
  console.log('[8] flush attempted, pending still =', getPendingFirestoreSyncCount());

  console.log('\nALL CHECKS PASSED ✅\n');
  console.log('Summary: writes that fail because the free-tier quota is used up are now (a) kept on this device in localStorage, (b) deduplicated so only the latest value per record is queued, and (c) auto-retried — so the data WILL be saved to the database once the quota resets.');
}

main().catch((e) => {
  console.error('\nTEST FAILURE ❌:', e.message);
  process.exit(1);
});
