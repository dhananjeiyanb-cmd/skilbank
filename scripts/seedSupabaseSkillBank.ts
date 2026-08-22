/**
 * One-shot seeder: sends ALL initial Skill Bank student records into a live
 * Supabase PostgreSQL database through the PostgREST endpoint
 * (`/rest/v1/skill_bank_students`), exactly like the app's dual-sync layer
 * (`src/lib/supabase.ts` -> `syncDocToSupabase`).
 *
 * Prerequisites:
 *   - The `skill_bank_students` table must exist. Run
 *     `supabase_skill_bank_seed.sql` in the Supabase SQL Editor first, or run
 *     the generated SQL script via psql.
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured
 *     (in a `.env` file in the project root or as environment variables).
 *
 * Usage (from the project root):
 *   npx tsx scripts/seedSupabaseSkillBank.ts
 *
 * Optional:
 *   DRY_RUN=1  – print how many records would be pushed without writing.
 */

import 'dotenv/config';
import { INITIAL_STUDENTS_SKILL_BANK } from '../src/data/mockSkillBank';

const DRY_RUN = process.env.DRY_RUN === '1';

function getDocId(st: any): string {
  const reg = st?.studentProfile?.registerNumber;
  if (reg !== undefined && reg !== null && String(reg).trim()) {
    return String(reg).trim().replace(/\//g, '_');
  }
  return '';
}

function buildUrl(): string {
  const env = process.env as Record<string, string | undefined>;
  let url = (env.VITE_SUPABASE_URL || '').trim();
  url = url.replace(/\/rest\/v1\/?$/, '');
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

async function main(): Promise<void> {
  const url = buildUrl();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    console.error('[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
    console.error('[Supabase] Add them to a .env file (see .env.example) and try again.');
    process.exitCode = 1;
    return;
  }
  if (!url.startsWith('http')) {
    console.error(`[Supabase] Invalid VITE_SUPABASE_URL: ${url}`);
    process.exitCode = 1;
    return;
  }

  const endpoint = `${url}/rest/v1/skill_bank_students`;
  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates', // upsert on primary key (id)
  };

  const records: { id: string; data: unknown; updated_at: string }[] = [];
  const seen = new Set<string>();

  for (const st of INITIAL_STUDENTS_SKILL_BANK) {
    const id = getDocId(st);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({ id, data: st, updated_at: new Date().toISOString() });
  }

  console.log(`=== Supabase skill_bank_students seeder ===`);
  console.log(`endpoint : ${endpoint}`);
  console.log(`records  : ${records.length}`);
  console.log(`mode     : ${DRY_RUN ? 'DRY_RUN (inventory only)' : 'LIVE (merge-duplicates upsert)'}`);
  console.log('');

  if (DRY_RUN) {
    records.forEach((r) => {
      const name = (r.data as any)?.studentProfile?.studentName || '?';
      console.log(`  - ${r.id}  ${name}`);
    });
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const rec of records) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(rec),
      });
      if (res.ok) {
        ok += 1;
      } else {
        failed += 1;
        const errText = await res.text().catch(() => '');
        console.error(`  x ${rec.id}: HTTP ${res.status} - ${errText.slice(0, 200)}`);
        if (res.status === 401 || res.status === 403) {
          console.error('[Supabase] Check the anon key / RLS policy on skill_bank_students.');
        }
      }
    } catch (err) {
      failed += 1;
      console.error(`  x ${rec.id} (network):`, (err as Error).message);
    }
  }

  console.log('');
  console.log(`DONE - ${ok} succeeded, ${failed} failed.`);
  if (failed > 0) process.exitCode = 2;
}

void main();