/**
 * Firestore SEED + UPDATE pipeline (one-shot, server-side).
 *
 * Pushes every seed dataset from `src/data` into the Google Firebase Firestore
 * database declared in `firebase-applet-config.json` — the same database the
 * app reads/writes at runtime (see src/context/AppContext.tsx and
 * src/context/CdcContext.tsx).
 *
 * Semantics: UPSERT / MERGE. Each record is PATCHed with updateMask set to its
 * top-level fields, so missing documents are created and existing documents
 * have only the seeded fields refreshed. Nothing is ever deleted.
 *
 * Usage (from the project root):
 *   tsx scripts/seedFirestore.ts
 *
 * Optional env knobs:
 *   DRY_RUN=1  – print the full inventory + per-collection counts only.
 *   SEED_ONLY  – comma-separated collection allow-list (e.g. "staff,classes").
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  INITIAL_STAFF,
  INITIAL_CLASSES,
  INITIAL_TASKS,
  INITIAL_OBSERVATIONS,
  INITIAL_DAILY_MONITORING,
  INITIAL_LESSON_PLANS,
  INITIAL_HOD_REPORT,
  INITIAL_NOTIFICATIONS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_EVENTS,
} from '../src/data/seedData';
import { INITIAL_CCM_MEETINGS } from '../src/data/ccmData';
import { INITIAL_STUDENTS_SKILL_BANK } from '../src/data/mockSkillBank';
import {
  CDC_SEED_QUESTIONS,
  CDC_SEED_EXAMS,
  CDC_SEED_STUDENTS,
  CDC_SEED_ATTEMPTS,
  CDC_SEED_SUSPICIOUS_EVENTS,
} from '../src/data/cdcSeedData';
import { buildMentorMappingsFromStudents } from '../src/utils/departmentUtils';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');

const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID: string = CONFIG.projectId;
const DB_ID: string = CONFIG.firestoreDatabaseId || 'default';
const API_KEY: string = CONFIG.apiKey;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}`;

const DRY_RUN = process.env.DRY_RUN === '1';
const ONLY = (process.env.SEED_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/* ------------------------------------------------------------------ */
/* Conversion utilities (plain JSON value -> Firestore protobuf field) */
/* ------------------------------------------------------------------ */
const cleanId = (id: string | number): string => String(id).trim().replace(/\//g, '_');

function toFsValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map((x) => toFsValue(x)) } };
  }
  if (typeof v === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === undefined) continue;
      fields[k] = toFsValue(val);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function toFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(data)) {
    if (val === undefined) continue;
    fields[k] = toFsValue(val);
  }
  return fields;
}

/* ------------------------------------------------------------------ */
/* Firestore REST write (PATCH + updateMask => merge-on-write)         */
/* ------------------------------------------------------------------ */
async function upsertDoc(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; status: string; message?: string }> {
  const docPath = `${collection}/${encodeURIComponent(cleanId(docId))}`;
  const mask = Object.keys(data).map((k) => `&updateMask.fieldPaths=${encodeURIComponent(k)}`).join('');
  const url = `${BASE}/documents/${docPath}?key=${encodeURIComponent(API_KEY)}${mask}`;
  const body = JSON.stringify({ name: `${BASE}/documents/${docPath}`, fields: toFields(data) });

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      let message = '';
      try {
        const j: any = await res.json();
        message = j?.error?.message || JSON.stringify(j);
      } catch {
        message = await res.text();
      }
      return { ok: false, status: String(res.status), message };
    }
    return { ok: true, status: '200' };
  } catch (err) {
    return { ok: false, status: 'network', message: String(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Build the full collection -> documents map from the seed modules    */
/* ------------------------------------------------------------------ */
function getStudentDocId(st: any): string {
  const reg = st?.studentProfile?.registerNumber;
  if (reg !== undefined && reg !== null && String(reg).trim()) {
    return cleanId(String(reg).trim());
  }
  if (st?.id) return cleanId(String(st.id).trim());
  const n = st?.studentProfile?.name || st?.studentProfile?.studentName;
  if (n) return `STU_${String(n).trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
  return '';
}

function build() {
  const skillBankStudents = INITIAL_STUDENTS_SKILL_BANK;
  const mentorMappings = buildMentorMappingsFromStudents(skillBankStudents, INITIAL_STAFF);

  return [
    { collection: 'staff', docs: INITIAL_STAFF.map((s) => ({ id: s.id, data: s })) },
    { collection: 'classes', docs: INITIAL_CLASSES.map((c) => ({ id: c.id, data: c })) },
    { collection: 'tasks', docs: INITIAL_TASKS.map((t) => ({ id: t.id, data: t })) },
    { collection: 'observations', docs: INITIAL_OBSERVATIONS.map((o) => ({ id: o.id, data: o })) },
    { collection: 'monitoring', docs: INITIAL_DAILY_MONITORING.map((m) => ({ id: m.id, data: m })) },
    { collection: 'lessonPlans', docs: INITIAL_LESSON_PLANS.map((lp) => ({ id: lp.id, data: lp })) },
    { collection: 'attendance', docs: INITIAL_ATTENDANCE_RECORDS.map((a) => ({ id: a.id, data: a })) },
    { collection: 'notifications', docs: INITIAL_NOTIFICATIONS.map((n) => ({ id: n.id, data: n })) },
    { collection: 'events', docs: INITIAL_EVENTS.map((ev) => ({ id: ev.id, data: ev })) },
    { collection: 'ccmMeetings', docs: INITIAL_CCM_MEETINGS.map((m) => ({ id: m.id, data: m })) },
    {
      collection: 'skillBankStudents',
      docs: skillBankStudents
        .map((st) => ({ id: getStudentDocId(st), data: st }))
        .filter((d) => d.id),
    },
    {
      collection: 'mentorMappings',
      docs: mentorMappings
        .map((m) => ({ id: (m as any).mentorStaffId, data: m }))
        .filter((d) => d.id),
    },
    { collection: 'cdcQuestions', docs: CDC_SEED_QUESTIONS.map((q) => ({ id: q.id, data: q })) },
    { collection: 'cdcExams', docs: CDC_SEED_EXAMS.map((e) => ({ id: e.id, data: e })) },
    { collection: 'cdcStudents', docs: CDC_SEED_STUDENTS.map((s) => ({ id: s.id, data: s })) },
    { collection: 'cdcExamAttempts', docs: CDC_SEED_ATTEMPTS.map((a) => ({ id: a.id, data: a })) },
    { collection: 'cdcSuspiciousLogs', docs: CDC_SEED_SUSPICIOUS_EVENTS.map((e) => ({ id: e.id, data: e })) },
    { collection: 'settings', docs: [{ id: 'dailyReport', data: INITIAL_HOD_REPORT }] },
  ];
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
async function main(): Promise<void> {
  const plan = build();
  const allow = new Set(ONLY);
  const filtered = ONLY.length ? plan.filter((g) => allow.has(g.collection)) : plan;
  const totalDocs = filtered.reduce((sum, g) => sum + g.docs.length, 0);

  console.log('=== Firestore SEED / UPDATE ===');
  console.log('project :', PROJECT_ID);
  console.log('database:', DB_ID);
  console.log('mode    :', DRY_RUN ? 'DRY_RUN (inventory only)' : 'LIVE (PATCH merge upsert)');
  console.log('');
  filtered.forEach((g) => {
    const marker = g.docs.length ? '' : '  (empty, skipped)';
    console.log(`  ${g.collection.padEnd(20)} ${String(g.docs.length).padStart(4)} doc(s)${marker}`);
  });
  console.log(`  ${'TOTAL'.padEnd(20)} ${String(totalDocs).padStart(4)} doc(s)`);
  console.log('');

  if (DRY_RUN) return;

  let okCount = 0;
  let failCount = 0;
  for (const g of filtered) {
    if (g.docs.length === 0) continue;
    let gOk = 0;
    for (const d of g.docs) {
      const res = await upsertDoc(g.collection, d.id, d.data as Record<string, unknown>);
      if (res.ok) {
        gOk += 1;
        okCount += 1;
      } else {
        failCount += 1;
        console.error(`  x ${g.collection}/${d.id}: HTTP ${res.status} - ${(res.message || '').slice(0, 200)}`);
        if (res.status === '429') {
          console.error('\n[quota] Firestore is quota-limited today - no further writes attempted.');
          console.error('[quota] Wait for the free-tier daily reset (00:00 US-Pacific / 07:00 UTC) or use a billing-enabled database.');
          process.exitCode = 3;
          return;
        }
      }
    }
    if (gOk > 0) console.log(`  ok ${g.collection}: wrote ${gOk}/${g.docs.length}`);
  }

  console.log('');
  console.log(`DONE - ${okCount} succeeded, ${failCount} failed.`);
}

void main();