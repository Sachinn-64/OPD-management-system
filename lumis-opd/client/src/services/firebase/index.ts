// Firebase Services Index
// These services use Firestore for data persistence

export { patientFirebaseService } from './patientService';
export { appointmentFirebaseService } from './appointmentService';
export { visitFirebaseService } from './visitService';
export { doctorFirebaseService } from './doctorService';
export { clinicFirebaseService } from './clinicService';

// Re-export auth utilities
export {
  signIn,
  signUp,
  logOut,
  resetPassword,
  getUserData,
  storeUserMapping,
  onAuthChange,
  getCurrentUser,
  type AuthUser,
} from '../../lib/firebase/auth';

// Re-export types
export * from '../../lib/firebase/types';
