import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Dev helpers - expose for console debugging
if (import.meta.env.DEV) {
  import('./services/doctorService').then(({ createTestDoctor, doctorService, debugDoctors }) => {
    (window as any).createTestDoctor = createTestDoctor;
    (window as any).doctorService = doctorService;
    (window as any).debugDoctors = debugDoctors;
    console.log('🔧 Dev helpers loaded: createTestDoctor(), debugDoctors()');
  });
  import('./store/authStore').then(({ useAuthStore }) => {
    (window as any).getClinicId = () => useAuthStore.getState().user?.clinicId;
    (window as any).getUser = () => useAuthStore.getState().user;
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
