import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

const app = initializeApp(firebaseConfig, 'clear-db');
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function clearCollection(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    console.log(`Found ${querySnapshot.size} documents in ${collectionName}`);
    let deletedCount = 0;
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, collectionName, docSnapshot.id));
      deletedCount++;
    }
    console.log(`Successfully deleted ${deletedCount} documents from ${collectionName}`);
  } catch (error) {
    console.error(`Failed to clear collection ${collectionName}:`, error.message);
  }
}

async function run() {
  console.log('=== CLEARING FIREBASE SKILL BANK COLLECTIONS ===');
  await clearCollection('skillBankStudents');
  await clearCollection('mentorMappings');
  await clearCollection('departmentRankings');
  console.log('=== CLEARING COMPLETE ===');
}

run().then(() => process.exit(0)).catch(e => { console.error('Error:', e); process.exit(1); });

