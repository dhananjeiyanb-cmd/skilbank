import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_STUDENTS_SKILL_BANK } from '../src/data/mockSkillBank';
import { INITIAL_STAFF } from '../src/data/seedData';
import { buildMentorMappingsFromStudents } from '../src/utils/departmentUtils';
import { getDepartmentRankingId, DEPARTMENT_RANKING_OPTIONS } from '../src/utils/principalSsbutil';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const PROJECT_ID: string = CONFIG.projectId;
const DB_ID: string = CONFIG.firestoreDatabaseId || 'default';
const API_KEY: string = CONFIG.apiKey;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}`;

const cleanId = (id: string | number): string => String(id).trim().replace(/\//g, '_');

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

async function deleteDoc(collection: string, docId: string) {
  const docPath = `${collection}/${encodeURIComponent(cleanId(docId))}`;
  const url = `${BASE}/documents/${docPath}?key=${encodeURIComponent(API_KEY)}`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      console.log(`Deleted ${collection}/${docId}`);
    } else {
      // It's normal to get 404 if the document was already deleted or not written
      console.log(`Delete response for ${collection}/${docId}: status ${res.status}`);
    }
  } catch (err) {
    console.error(`Error deleting ${collection}/${docId}:`, err);
  }
}

async function run() {
  console.log('Starting direct deletion of seeded data...');

  // Delete students
  for (const st of INITIAL_STUDENTS_SKILL_BANK) {
    const docId = getStudentDocId(st);
    if (docId) {
      await deleteDoc('skillBankStudents', docId);
    }
  }

  // Delete mentor mappings
  const mentorMappings = buildMentorMappingsFromStudents(INITIAL_STUDENTS_SKILL_BANK, INITIAL_STAFF);
  for (const m of mentorMappings) {
    if (m.mentorStaffId) {
      await deleteDoc('mentorMappings', m.mentorStaffId);
    }
  }

  // Delete department rankings
  await deleteDoc('departmentRankings', 'latest');
  for (const dept of DEPARTMENT_RANKING_OPTIONS) {
    const deptId = getDepartmentRankingId(dept);
    if (deptId) {
      await deleteDoc('departmentRankings', deptId);
    }
  }

  console.log('Finished clearing seeded data!');
}

run();

