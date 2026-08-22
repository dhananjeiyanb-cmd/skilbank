/**
 * Generates the complete Supabase SQL seed script for the Skill Bank.
 *
 * Source of truth: `src/data/mockSkillBank.ts` -> `INITIAL_STUDENTS_SKILL_BANK`
 * (all student records with their full monitoring payloads).
 *
 * Outputs:
 *   1. `supabase_skill_bank_seed.sql`  - self-contained script: creates the
 *      `skill_bank_students` table (if missing), enables RLS with the public
 *      anon policy, adds the GIN index, then UPSERTs every student record.
 *   2. Patches `supabase_all_tables_and_data.sql` - replaces the 2-row
 *      placeholder seed with the full dataset so the consolidated script stays
 *      complete.
 *
 * Usage (from the project root):
 *   npx tsx scripts/generateSkillBankSeedSql.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_STUDENTS_SKILL_BANK } from '../src/data/mockSkillBank';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');

/** Stable doc id for a student (register number => Firestore/Supabase id). */
function getDocId(st: any): string {
  const reg = st?.studentProfile?.registerNumber;
  if (reg !== undefined && reg !== null && String(reg).trim()) {
    return String(reg).trim().replace(/\//g, '_');
  }
  return '';
}

/**
 * Quote a value as a PostgreSQL single-quoted string literal.
 * `standard_conforming_strings` is ON in Postgres 9.1+ / Supabase, so single
 * quotes are escaped by doubling them (`'` -> `''`).
 */
function sqlString(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

/**
 * Build the multi-row INSERT ... ON CONFLICT block for every student.
 * Also validates each JSON payload (round-trips through JSON.parse) so the
 * generated SQL is guaranteed to contain valid JSONB.
 */
function buildInsertBlock(): string {
  const rows: string[] = [];
  const seen = new Set<string>();

  for (const st of INITIAL_STUDENTS_SKILL_BANK) {
    const id = getDocId(st);
    if (!id) {
      console.warn('[skip] record without registerNumber:', JSON.stringify(st)?.slice(0, 140));
      continue;
    }
    if (seen.has(id)) {
      console.warn(`[skip] duplicate id ${id}`);
      continue;
    }
    seen.add(id);

    const json = JSON.stringify(st, (k, v) => v ?? undefined);
    const parsed = JSON.parse(json);
    if (!parsed || !parsed.studentProfile) {
      throw new Error(`Invalid payload for ${id}`);
    }
    rows.push(`  (${sqlString(id)}, ${sqlString(json)}, NOW())`);
  }

  if (rows.length === 0) {
    throw new Error('No skill bank students were generated!');
  }

  return `-- Seed Skill Bank Students (${rows.length} records, full payloads)
INSERT INTO skill_bank_students (id, data, updated_at) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
`;
}

/** The full standalone seed script (table + RLS + index + data). */
function buildFullScript(insertBlock: string, count: number): string {
  return `-- ============================================================================
-- SASURIE TASK MONITORING & MENTOR-MENTEE SYSTEM -- SKILL BANK SEED SCRIPT
-- Project: lwzhbxtgdyancsavcbgc
-- Database: postgres (us-west1)
--
-- Creates the skill_bank_students table and seeds ALL initial Skill Bank
-- student records (${count} students) with their complete payloads.
-- Generated from src/data/mockSkillBank.ts (INITIAL_STUDENTS_SKILL_BANK).
-- Idempotent: CREATE TABLE IF NOT EXISTS + UPSERT (ON CONFLICT DO UPDATE).
-- Run in the Supabase SQL Editor (https://app.supabase.com) or via:
--   psql "$DATABASE_URL" -f supabase_skill_bank_seed.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Skill Bank Students Table
CREATE TABLE IF NOT EXISTS skill_bank_students (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public Read/Write for Anon API Key
ALTER TABLE skill_bank_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read/Write skill_bank_students" ON skill_bank_students;
CREATE POLICY "Public Read/Write skill_bank_students" ON skill_bank_students
  FOR ALL USING (true) WITH CHECK (true);

-- Performance index on the JSONB data column
CREATE INDEX IF NOT EXISTS idx_skill_bank_students_data ON skill_bank_students USING gin (data);

${insertBlock}
-- Verification query: SELECT count(*) FROM skill_bank_students;
`;
}

function main(): void {
  const count = INITIAL_STUDENTS_SKILL_BANK.filter(
    (st: any) => st?.studentProfile?.registerNumber,
  ).length;

  const insertBlock = buildInsertBlock();
  const fullScript = buildFullScript(insertBlock, count);

  const outFile = path.join(ROOT, 'supabase_skill_bank_seed.sql');
  fs.writeFileSync(outFile, fullScript, 'utf8');

  // Patch the consolidated script: replace the placeholder skill bank seed block.
  const combinedFile = path.join(ROOT, 'supabase_all_tables_and_data.sql');
  const combinedSrc = fs.readFileSync(combinedFile, 'utf8');

  const startMarker = '-- Seed Sample Skill Bank Students';
  const endMarker = 'ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();\n';

  const startIdx = combinedSrc.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Could not locate '${startMarker}' in ${combinedFile}`);
  }
  const endIdx = combinedSrc.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    throw new Error(`Could not locate end marker in ${combinedFile}`);
  }

  const patched =
    combinedSrc.slice(0, startIdx) + insertBlock + combinedSrc.slice(endIdx + endMarker.length);
  fs.writeFileSync(combinedFile, patched, 'utf8');

  const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log('');
  console.log(`Generated : ${path.relative(ROOT, outFile)} (${sizeKb} KB)`);
  console.log(`Patched   : ${path.relative(ROOT, combinedFile)}`);
  console.log(`Students  : ${count} records`);
}

main();