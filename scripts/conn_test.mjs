// Replicate the app's exact Firebase initialization and do a real read+write test.
import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, getDocFromServer, doc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'gen-lang-client-0262440833',
  appId: '1:62618017992:web:1f0d5a4cd3af23bdaa45fd',
  apiKey: 'AIzaSyB90Y_wnQFnDZ3TlBSlYr9BDVGRZ3HsFaw',
  authDomain: 'gen-lang-client-0262440833.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-hodfacultytaskmo-3ed80699-eb26-46fb-9d56-0c5d50adc802',
  storageBucket: 'gen-lang-client-0262440833.firebasestorage.app',
  messagingSenderId: '62618017992',
  measurementId: '',
};

const app = initializeApp(firebaseConfig, 'conn-test');
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  // 1) Read test
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log('GET system/connection_test OK');
  } catch (e) {
    console.log('GET system/connection_test FAILED:', e.code, e.message);
  }

  // 2) Write test into 'systemLogs'
  try {
    await setDoc(doc(db, 'systemLogs', 'CONN_TEST'), {
      id: 'CONN_TEST',
      timestamp: new Date().toISOString(),
      userId: 'test_user',
      userName: 'Test User',
      role: 'staff',
      department: 'test_dept',
      action: 'test_action',
      details: 'test_details',
    }, { merge: true });
    console.log('WRITE systemLogs/CONN_TEST OK');
  } catch (e) {
    console.log('WRITE systemLogs/CONN_TEST FAILED:', e.code, e.message);
  }

  // 3) List a couple of collections to see what actually exists server-side
  for (const coll of ['staff', 'tasks', 'settings']) {
    try {
      const qs = await getDocs(collection(db, coll));
      console.log(`LIST ${coll}: ${qs.size} docs (head: ${qs.docs.slice(0, 5).map(d => d.id).join(', ')})`);
    } catch (e) {
      console.log(`LIST ${coll} FAILED:`, e.code, e.message);
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error('Unhandled:', e.code, e.message); process.exit(1); });