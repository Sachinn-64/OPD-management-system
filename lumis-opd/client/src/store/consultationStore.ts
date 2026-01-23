import { create } from 'zustand';
import type { Appointment } from '../services/appointmentService';

export interface Patient {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
}

interface ConsultationState {
  // Current consultation
  currentVisit: Appointment | null;
  currentPatient: Patient | null;
  selectedAppointment: Appointment | null; // Full appointment with opdVisit
  
  // Queue
  todayQueue: Appointment[];
  selectedQueueIndex: number;
  
  // Voice Recording
  isRecording: boolean;
  activeField: string | null;
  
  // Consultation Data
  vitals: any | null;
  clinicalHistory: any[];
  clinicalNotes: any[];
  diagnoses: any[];
  prescriptions: any[];
  investigations: any[];
  
  // Actions
  setCurrentVisit: (visit: Appointment | null) => void;
  setCurrentPatient: (patient: Patient | null) => void;
  setTodayQueue: (queue: Appointment[]) => void;
  selectQueuePatient: (index: number) => void;
  nextPatient: () => void;
  previousPatient: () => void;
  
  // Voice Actions
  startRecording: (fieldName: string) => void;
  stopRecording: () => void;
  
  // Data Actions
  setVitals: (vitals: any) => void;
  addClinicalHistory: (history: any) => void;
  addClinicalNote: (note: any) => void;
  addDiagnosis: (diagnosis: any) => void;
  addPrescription: (prescription: any) => void;
  addInvestigation: (investigation: any) => void;
  
  // Clear consultation
  clearConsultation: () => void;
}

export const useConsultationStore = create<ConsultationState>((set, get) => ({
  // Initial state
  currentVisit: null,
  currentPatient: null,
  selectedAppointment: null,
  todayQueue: [],
  selectedQueueIndex: -1,
  isRecording: false,
  activeField: null,
  vitals: null,
  clinicalHistory: [],
  clinicalNotes: [],
  diagnoses: [],
  prescriptions: [],
  investigations: [],

  // Visit/Patient Actions
  setCurrentVisit: (visit) => set({ currentVisit: visit }),
  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  
  setTodayQueue: (queue) => set({ todayQueue: queue }),
  
  selectQueuePatient: (index) => {
    const queue = get().todayQueue;
    if (index >= 0 && index < queue.length) {
      const appointment = queue[index];
      set({
        selectedQueueIndex: index,
        currentVisit: appointment,
        currentPatient: appointment.patient || null,
        selectedAppointment: appointment, // Store full appointment with opdVisit
      });
    }
  },
  
  nextPatient: () => {
    const { selectedQueueIndex, todayQueue } = get();
    if (selectedQueueIndex < todayQueue.length - 1) {
      get().selectQueuePatient(selectedQueueIndex + 1);
    }
  },
  
  previousPatient: () => {
    const { selectedQueueIndex } = get();
    if (selectedQueueIndex > 0) {
      get().selectQueuePatient(selectedQueueIndex - 1);
    }
  },

  // Voice Actions
  startRecording: (fieldName) => set({ isRecording: true, activeField: fieldName }),
  stopRecording: () => set({ isRecording: false, activeField: null }),

  // Data Actions
  setVitals: (vitals) => set({ vitals }),
  addClinicalHistory: (history) => set((state) => ({
    clinicalHistory: [...state.clinicalHistory, history],
  })),
  addClinicalNote: (note) => set((state) => ({
    clinicalNotes: [...state.clinicalNotes, note],
  })),
  addDiagnosis: (diagnosis) => set((state) => ({
    diagnoses: [...state.diagnoses, diagnosis],
  })),
  addPrescription: (prescription) => set((state) => ({
    prescriptions: [...state.prescriptions, prescription],
  })),
  addInvestigation: (investigation) => set((state) => ({
    investigations: [...state.investigations, investigation],
  })),

  // Clear consultation
  clearConsultation: () => set({
    currentVisit: null,
    currentPatient: null,
    vitals: null,
    clinicalHistory: [],
    clinicalNotes: [],
    diagnoses: [],
    prescriptions: [],
    investigations: [],
  }),
}));
