import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { User, COLLECTIONS } from './types';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  clinicId: string;
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist';
  username: string;
}

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Fetch user data from Firestore to get clinicId and role
  const userData = await getUserData(user.uid);
  if (!userData) {
    throw new Error('User data not found in database');
  }
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    clinicId: userData.clinicId,
    role: userData.role,
    username: userData.username,
  };
};

// Sign up a new user (admin only for creating clinic users)
export const signUp = async (
  email: string,
  password: string,
  clinicId: string,
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist',
  username: string,
  doctorDetails?: {
    firstName: string;
    lastName: string;
    specialty: string;
    registrationNumber: string;
    qualification?: string;
    consultationFee?: number;
  }
): Promise<AuthUser> => {
  const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update display name
  await updateProfile(user, { displayName: username });
  
  const userData = {
    clinicId,
    email,
    username,
    role,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Store user data in 'users' collection (flat structure)
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

  // If role is doctor, also create a doctor record
  if (role === 'doctor' && doctorDetails) {
    const doctorData = {
      clinicId,
      userId: user.uid,
      firstName: doctorDetails.firstName,
      lastName: doctorDetails.lastName,
      specialty: doctorDetails.specialty,
      registrationNumber: doctorDetails.registrationNumber,
      qualification: doctorDetails.qualification || '',
      consultationFee: doctorDetails.consultationFee || 0,
      email,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(doc(db, COLLECTIONS.DOCTORS, user.uid), doctorData);
  }
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: username,
    clinicId,
    role,
    username,
  };
};

// Sign out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<User | null> => {
  // We need to search across all clinics for this user
  // In a real app, you might store a root-level user collection with clinicId reference
  // For now, we'll use a root-level users collection for quick lookup
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

// Store user data in root users collection for quick lookup
export const storeUserMapping = async (
  uid: string,
  clinicId: string,
  email: string,
  username: string,
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist'
): Promise<void> => {
  await setDoc(doc(db, 'users', uid), {
    clinicId,
    email,
    username,
    role,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

// Subscribe to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current Firebase user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
