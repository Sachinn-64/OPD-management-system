import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { getUserData } from './lib/firebase/auth';
import { clinicFirebaseService } from './services/firebase/clinicService';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ClinicRegistrationPage } from './pages/auth/ClinicRegistrationPage';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { ReceptionDashboard } from './pages/reception/ReceptionDashboard';
import { GeneralDashboard } from './pages/dashboard/GeneralDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard';
import './styles/index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Auth Initializer Component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser, setClinic, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userData = await getUserData(firebaseUser.uid);
          if (userData) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              username: userData.username,
              role: userData.role,
              clinicId: userData.clinicId,
            });

            // Load clinic data (skip for super admins - they manage multiple clinics)
            if (userData.role !== 'super_admin' && userData.clinicId) {
              const clinicData = await clinicFirebaseService.getById(userData.clinicId);
              if (clinicData) {
                setClinic(clinicData);
              }
            }
          } else {
            setUser(null);
            setClinic(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
          setClinic(null);
        }
      } else {
        setUser(null);
        setClinic(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setClinic, setLoading]);

  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Role-based Route Component
const RoleRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Spinner handled by ProtectedRoute usually
  }

  // Check based on single role (mapped to roles array in store)
  if (!user || !user.roles.some((role) => allowedRoles.includes(role.toLowerCase()))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route - redirects to dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to appropriate dashboard based on role
  if (isAuthenticated && user) {
    const roles = user.roles.map(r => r.toLowerCase());
    
    if (roles.includes('super_admin')) {
      return <Navigate to="/super-admin/dashboard" replace />;
    } else if (roles.includes('admin')) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (roles.includes('doctor')) {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (roles.includes('receptionist')) {
      return <Navigate to="/reception/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <BrowserRouter>
          <Routes>
            {/* Public Routes - redirect to dashboard if already logged in */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/register-clinic" element={<PublicRoute><ClinicRegistrationPage /></PublicRoute>} />

            {/* Protected Routes */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['super_admin']}>
                    <SuperAdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reception/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['receptionist']}>
                    <ReceptionDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={ 
                <ProtectedRoute>
                  <GeneralDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </QueryClientProvider>
  );
}

export default App;
