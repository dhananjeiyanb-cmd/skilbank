import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { getSupabaseConfig, isSupabaseConfigured, syncDocToSupabase } from './supabase';

const COLLECTIONS_TO_SEED: Record<string, string> = {
  skillBankStudents: 'skill_bank_students',
  mentorMappings: 'mentor_mappings',
  staff: 'staff',
  classes: 'classes',
  tasks: 'tasks',
  observations: 'observations',
  attendance: 'attendance',
  facultyKpis: 'faculty_kpis',
  departmentRankings: 'department_rankings',
};

export async function seedAllFirebaseDataToSupabase(onProgress?: (msg: string) => void): Promise<{
  success: boolean;
  totalSynced: number;
  details: Record<string, number>;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      totalSynced: 0,
      details: {},
      error: 'Supabase URL or Anon Key is missing in Vercel environment variables.',
    };
  }

  let totalSynced = 0;
  const details: Record<string, number> = {};

  try {
    for (const [fsCol, sbTable] of Object.entries(COLLECTIONS_TO_SEED)) {
      if (onProgress) onProgress(`Reading ${fsCol} from Firebase...`);

      const snap = await getDocs(collection(db, fsCol));
      let colSuccess = 0;

      for (const d of snap.docs) {
        const docId = d.id;
        const data = d.data();
        const ok = await syncDocToSupabase(sbTable, docId, data);
        if (ok) {
          colSuccess += 1;
          totalSynced += 1;
        }
      }

      details[sbTable] = colSuccess;
      if (onProgress) onProgress(`Synced ${colSuccess} records to Supabase "${sbTable}"`);
    }

    return {
      success: true,
      totalSynced,
      details,
    };
  } catch (err: any) {
    console.error('Error during full Firebase to Supabase seeding:', err);
    return {
      success: false,
      totalSynced,
      details,
      error: err.message || 'Seeding failed',
    };
  }
}
