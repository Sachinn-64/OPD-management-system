/**
 * Clear all documents from the `medicines` collection in Firestore.
 *
 * Run: npx tsx scripts/clear-medicines.ts
 */
/// <reference types="node" />

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';

// Same Firebase config as client app
const firebaseConfig = {
  apiKey: 'AIzaSyBSopePSfm16f2SEXayMURxjWjaAKa1UaI',
  authDomain: 'warehouse-ec83e.firebaseapp.com',
  projectId: 'warehouse-ec83e',
  storageBucket: 'warehouse-ec83e.firebasestorage.app',
  messagingSenderId: '571724411146',
  appId: '1:571724411146:web:af3414eb971cc5b7d80af3',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearMedicines() {
  console.log('Fetching medicines to delete...');
  const snap = await getDocs(collection(db, 'medicines'));
  const docs = snap.docs;
  console.log(`Found ${docs.length} medicines to delete.`);

  let deleted = 0;

  for (const d of docs) {
    try {
      await deleteDoc(doc(db, 'medicines', d.id));
      deleted++;
      if (deleted % 100 === 0) {
        console.log(`Deleted ${deleted} medicines...`);
      }
    } catch (e) {
      console.error(`Error deleting ${d.id}:`, e);
    }
  }

  console.log(`Done. Deleted ${deleted} medicines.`);
}

clearMedicines()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

