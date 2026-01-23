import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyBSopePSfm16f2SEXayMURxjWjaAKa1UaI",
  authDomain: "warehouse-ec83e.firebaseapp.com",
  projectId: "warehouse-ec83e",
  storageBucket: "warehouse-ec83e.firebasestorage.app",
  messagingSenderId: "571724411146",
  appId: "1:571724411146:web:af3414eb971cc5b7d80af3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development (optional - for local testing)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;
