/**
 * Quick debug script to list some medicines from Firestore (with itemType).
 */
/// <reference types="node" />

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

async function main() {
  const snap = await getDocs(query(collection(db, 'medicines'), limit(10)));
  console.log(`Total fetched: ${snap.size}`);
  snap.docs.forEach((d, idx) => {
    const data = d.data() as any;
    console.log(
      `${idx + 1}. ${data.name}  [generic: ${data.genericName ?? ''}]  [itemType: ${data.itemType ?? ''}]`,
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

