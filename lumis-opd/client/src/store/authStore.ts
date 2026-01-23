import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser as FirebaseAuthUser } from '../lib/firebase/auth';
import { Clinic } from '../lib/firebase/types';

// Extended user for compatibility with legacy components that expect roles array
export interface User extends FirebaseAuthUser {
  roles: string[];
  id: string; // Map uid to id for compatibility
}

interface AuthState {
  user: User | null;
  clinic: Clinic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: FirebaseAuthUser | null) => void;
  setClinic: (clinic: Clinic | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  
  // Helpers
  getClinicId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      clinic: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (firebaseUser) => {
        if (firebaseUser) {
          set({ 
            user: { 
              ...firebaseUser, 
              roles: [firebaseUser.role],
              id: firebaseUser.uid 
            }, 
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          set({ 
            user: null, 
            clinic: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      setClinic: (clinic) => set({ clinic }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () => {
        set({
          user: null,
          clinic: null,
          isAuthenticated: false,
        });
      },

      getClinicId: () => {
        const state = get();
        return state.user?.clinicId || null;
      },
    }),
    {
      name: 'lumis-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        clinic: state.clinic,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
