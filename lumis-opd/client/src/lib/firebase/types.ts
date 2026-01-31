// Firestore Collection Types for Lumis OPD

export interface Clinic {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial';
  subscriptionEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id?: string;
  clinicId: string;
  email: string;
  username: string;
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Doctor {
  id?: string;
  clinicId: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  specialties?: { specialtyName: string; subSpecialty?: string; isPrimary?: boolean }[];
  registrationNumber: string;
  qualification?: string;
  consultationFee: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id?: string;
  clinicId?: string; // Optional for flat collections
  uhid: string; // Auto-generated unique health ID
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  gender: 'male' | 'female' | 'other';
  phone?: string;
  mobile?: string; // Alias for phone
  alternateMobile?: string;
  email?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  patientCategory?: string;
  aadharNumber?: string;
  referredByName?: string;
  referredByOrganization?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id?: string;
  clinicId?: string; // Optional for flat collections
  patientId: string;
  doctorId: string;
  appointmentDate: string; // ISO date string
  appointmentTime: string; // HH:mm format
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  consultationFee: number;
  paymentStatus: 'pending' | 'paid';
  notes?: string;
  queueNumber?: number;
  tokenNumber?: string;
  // Legacy compatibility: can hold embedded patient/visit data
  patient?: Patient;
  opdVisit?: Visit;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vital {
  vitalName: string;
  vitalValue: string | number;
  vitalUnit?: string;
}

export interface VitalRecord {
  id?: string;
  visitId: string;
  recordedAt: Date;
  recordedBy: string; // userId
  details: Vital[];
  // Direct vital properties for legacy compatibility
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  heartRate?: number; // Alias for pulseRate
  respiratoryRate?: number;
  oxygenSaturation?: number;
  spo2?: number; // Alias for oxygenSaturation
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  painScale?: number;
}

export interface ClinicalHistory {
  id?: string;
  visitId: string;
  historyType: 'CHIEF_COMPLAINT' | 'PRESENT_ILLNESS' | 'PAST_MEDICAL' | 'FAMILY' | 'ALLERGY' | 'ADDICTION';
  description: string;
  recordedAt: Date;
}

export interface ClinicalNote {
  id?: string;
  visitId: string;
  noteType: 'CHIEF_COMPLAINT' | 'EXAMINATION' | 'ASSESSMENT' | 'ASSESSMENT_PLAN' | 'FOLLOW_UP';
  noteText: string;
  content?: string; // Alias for noteText (legacy compatibility)
  recordedAt: Date;
}

export interface Diagnosis {
  id?: string;
  visitId: string;
  diagnosisType: 'PRIMARY' | 'SECONDARY' | 'DIFFERENTIAL';
  diagnosisText: string;
  diagnosisName?: string; // Alias for diagnosisText
  diagnosisCode?: string; // Alias for icdCode
  icdCode?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
  recordedAt: Date;
}

export interface PrescriptionItem {
  drugName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  beforeAfterFood: 'BEFORE' | 'AFTER' | 'WITH';
  route?: string;
  quantity?: number;
  instructions?: string;
}

export interface Prescription {
  id?: string;
  visitId: string;
  items: PrescriptionItem[];
  notes?: string;
  prescribedAt: Date;
  // Direct properties for single-item legacy compatibility
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface Visit {
  id?: string;
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  visitDate: string; // ISO date string
  visitStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  
  // Embedded data for quick access
  chiefComplaint?: string;
  generalAdvice?: string;
  dietaryAdvice?: string;
  activityAdvice?: string;
  followUpPlan?: string;
  followUpDate?: string;
  
  // References to sub-collections or embedded arrays
  vitals?: VitalRecord[];
  histories?: ClinicalHistory[];
  notes?: ClinicalNote[];
  diagnoses?: Diagnosis[];
  prescriptions?: Prescription[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Medicine {
  id?: string;
  name: string;
  genericName?: string;
  category?: string;
  manufacturer?: string;
  strength?: string;
  form?: 'TAB' | 'CAP' | 'SYP' | 'INJ' | 'CREAM' | 'GEL' | 'DROPS' | 'POWDER' | 'OTHER';
  quantity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Referral {
  id?: string;
  clinicId: string;
  visitId: string;
  patientId: string;
  referralType: 'specialist' | 'hospital' | 'higher';
  referTo: string;
  specialty?: string;
  reason: string;
  priority: 'routine' | 'urgent' | 'emergency';
  clinicalSummary?: string;
  createdAt: Date;
}

// Collection paths helper - SIMPLIFIED (no clinic nesting)
export const COLLECTIONS = {
  CLINICS: 'clinics',
  USERS: 'users',
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  VISITS: 'visits',
  REFERRALS: 'referrals',
  MEDICINES: 'medicines',
} as const;
