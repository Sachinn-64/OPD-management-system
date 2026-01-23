// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  AUTH_URL: '/api/auth',
  API_URL: `/api/${import.meta.env.VITE_API_VERSION || 'v1'}`,
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
};

// Hospital Information
export const HOSPITAL_INFO = {
  name: 'Raghoji Kidney & Multispeciality Hospital Hospital',
  location: 'Solapur',
  speciality: 'Kidney & Multispeciality Hospital',
  tagline: 'Advanced Healthcare with Compassion',
  address: 'Medical Center Road, Solapur - 413001, Maharashtra',
  phone: '+91 22 1234 5678',
  email: 'info@raghojihospital.com',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PATHOLOGY_STAFF: 'pathology_staff',
  RADIOLOGY_STAFF: 'radiology_staff',
  CASUALTY: 'casualty',
} as const;

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

// Visit Status
export const VISIT_STATUS = {
  REGISTERED: 'REGISTERED',
  WAITING: 'WAITING',
  IN_CONSULTATION: 'IN_CONSULTATION',
  COMPLETED: 'COMPLETED',
} as const;

// History Types
export const HISTORY_TYPES = {
  CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
  PRESENT_ILLNESS: 'PRESENT_ILLNESS',
  PAST_MEDICAL: 'PAST_MEDICAL',
  PAST_SURGICAL: 'PAST_SURGICAL',
  FAMILY: 'FAMILY',
  SOCIAL: 'SOCIAL',
  ALLERGY: 'ALLERGY',
  MEDICATION: 'MEDICATION',
} as const;

// Note Types
export const NOTE_TYPES = {
  EXAMINATION: 'EXAMINATION',
  ASSESSMENT: 'ASSESSMENT',
  PLAN: 'PLAN',
  GENERAL: 'GENERAL',
} as const;

// Diagnosis Types
export const DIAGNOSIS_TYPES = {
  PROVISIONAL: 'PROVISIONAL',
  FINAL: 'FINAL',
  DIFFERENTIAL: 'DIFFERENTIAL',
} as const;

// Vital Signs
export const VITAL_SIGNS = [
  { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', step: '1', normalRange: '90-120' },
  { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', step: '1', normalRange: '60-80' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', step: '1', normalRange: '60-100' },
  { key: 'respiratoryRate', label: 'Respiratory Rate', unit: '/min', step: '1', normalRange: '12-20' },
  { key: 'temperature', label: 'Temperature', unit: '°F', step: '0.1', normalRange: '97-99' },
  { key: 'oxygenSaturation', label: 'SpO2', unit: '%', step: '1', normalRange: '95-100' },
  { key: 'weight', label: 'Weight', unit: 'kg', step: '0.1', normalRange: '' },
  { key: 'height', label: 'Height', unit: 'cm', step: '0.1', normalRange: '' },
  { key: 'serumCreatinine', label: 'Serum Creatinine', unit: 'mg/dL', step: '0.01', normalRange: '0.7-1.3' },
];

// Voice Recognition Languages
export const VOICE_LANGUAGES = {
  ENGLISH_IN: 'en-IN',
  ENGLISH_US: 'en-US',
  HINDI: 'hi-IN',
  MARATHI: 'mr-IN',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
