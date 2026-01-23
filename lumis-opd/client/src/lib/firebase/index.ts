// Firebase exports
export { auth, db } from '../../config/firebase';

// Auth exports
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
} from './auth';

// Firestore exports
export {
  FirestoreService,
  convertTimestamps,
  where,
  orderBy,
  limit,
  Timestamp,
} from './firestore';

// Type exports
export * from './types';
