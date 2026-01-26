import { FirestoreService, where, orderBy, COLLECTIONS, Visit, VitalRecord, ClinicalHistory, ClinicalNote, Diagnosis, Prescription, Vital } from '../lib/firebase';


export type { Visit, VitalRecord as Vitals };

// Exported types for components
export interface PrescriptionTemplate {
  id: string;
  name: string;
  items: TemplateItem[];
}

export interface TemplateItem {
  drugName: string;
  dosage?: string;
  frequency: string;
  timing?: string;
  durationDays: number;
  instructions?: string;
}

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Visit>(COLLECTIONS.VISITS);

class ConsultationService {
  // Create a new consultation/visit
  async create(
    visitData: Omit<Visit, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Visit> {
    const service = getService();
    
    // Check if a visit already exists for this appointment
    const existing = await service.query('appointmentId', '==', visitData.appointmentId);
    if (existing.length > 0) {
      return existing[0];
    }

    const id = await service.create({
      ...visitData,
      visitStatus: 'OPEN',
      vitals: [],
      histories: [],
      notes: [],
      diagnoses: [],
      prescriptions: [],
    } as any);
    
    return {
      id,
      ...visitData,
      visitStatus: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Get visit by ID
  async getById(visitId: string): Promise<Visit | null> {
    return getService().getById(visitId);
  }

  // Get visit by Appointment ID
  async getByAppointmentId(appointmentId: string): Promise<Visit | null> {
    const visits = await getService().query('appointmentId', '==', appointmentId);
    return visits.length > 0 ? visits[0] : null;
  }

  // Update visit
  async update(visitId: string, data: Partial<Visit>): Promise<void> {
    // Clean data - remove undefined values that Firestore doesn't accept
    const cleanedData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    return getService().update(visitId, {
        ...cleanedData,
        updatedAt: new Date()
    } as any);
  }

  // Finish consultation
  async finish(visitId: string): Promise<void> {
    return this.update(visitId, { visitStatus: 'COMPLETED' });
  }

  // Get patient history
  async getPatientHistory(patientId: string): Promise<Visit[]> {
    return getService().getAll([
      where('patientId', '==', patientId),
      where('visitStatus', '==', 'COMPLETED'),
      orderBy('visitDate', 'desc'),
    ]);
  }

  // Get patient visits by doctor (for patient history in consultation)
  async getPatientVisitsByDoctor(patientId: string, doctorId?: string): Promise<any[]> {
    try {
      console.log('=== getPatientVisitsByDoctor ===');
      console.log('Patient ID:', patientId);
      console.log('Doctor ID:', doctorId);
      
      // Simple query to avoid index issues - just filter by patientId
      let visits = await getService().query('patientId', '==', patientId);
      
      console.log('Raw visits found:', visits.length);
      
      // Filter by doctorId in memory if provided
      if (doctorId) {
        visits = visits.filter(v => v.doctorId === doctorId);
        console.log('After doctorId filter:', visits.length);
      }
      
      // Sort by visitDate descending in memory
      visits.sort((a, b) => {
        const dateA = new Date(a.visitDate || '');
        const dateB = new Date(b.visitDate || '');
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('Sorted visits:', visits.length);
      
      // For each visit, fetch the associated appointment
      const visitsWithAppointments = await Promise.all(
        visits.map(async (visit) => {
          try {
            let appointmentData = null;
            
            // Fetch appointment if appointmentId exists
            if (visit.appointmentId) {
              const { db } = await import('../config/firebase');
              const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
              const appointmentRef = firestoreDoc(db, COLLECTIONS.APPOINTMENTS, visit.appointmentId);
              const appointmentSnap = await getDoc(appointmentRef);
              
              if (appointmentSnap.exists()) {
                appointmentData = { id: appointmentSnap.id, ...appointmentSnap.data() };
              }
            }
            
            // Return in appointment format with opdVisit embedded
            return {
              id: visit.appointmentId || visit.id,
              appointmentDate: visit.visitDate,
              appointmentTime: appointmentData?.appointmentTime || '00:00',
              appointmentStatus: appointmentData?.status,
              patientId: visit.patientId,
              doctorId: visit.doctorId,
              opdVisit: visit, // Embed the full visit data
            };
          } catch (err) {
            console.error('Error fetching appointment for visit:', visit.id, err);
            // Return visit data in appointment format even if appointment fetch fails
            return {
              id: visit.id,
              appointmentDate: visit.visitDate,
              appointmentTime: '00:00',
              patientId: visit.patientId,
              doctorId: visit.doctorId,
              opdVisit: visit,
            };
          }
        })
      );
      
      console.log('Returning visits with appointments:', visitsWithAppointments.length);
      console.log('Sample visit:', visitsWithAppointments[0]);
      return visitsWithAppointments;
    } catch (err) {
      console.error('!!! Error in getPatientVisitsByDoctor:', err);
      console.error('Error details:', err);
      return [];
    }
  }

  // Get vitals by visit - vitals are embedded in visit document
  async getVitalsByVisit(visitId: string): Promise<VitalRecord[]> {
    const visit = await this.getById(visitId);
    return visit?.vitals || [];
  }

  // Add vitals to visit
  async addVitals(visitId: string, vitals: Omit<VitalRecord, 'id'>): Promise<void> {
    const visit = await this.getById(visitId);
    if (!visit) throw new Error('Visit not found');
    
    const vitalRecord: VitalRecord = {
      ...vitals,
      id: `vital_${Date.now()}`,
      recordedAt: new Date(),
    };
    const updatedVitals = [...(visit.vitals || []), vitalRecord];
    return this.update(visitId, { vitals: updatedVitals });
  }

  // Update vitals
  async updateVitals(visitId: string, vitals: VitalRecord[]): Promise<void> {
    return this.update(visitId, { vitals });
  }

  // ============== HISTORY METHODS ==============
  
  // Add clinical history
  async addHistory(visitId: string, history: Omit<ClinicalHistory, 'id' | 'recordedAt'>): Promise<void> {
    const visit = await this.getById(visitId);
    if (!visit) throw new Error('Visit not found');
    
    const historyRecord: ClinicalHistory = {
      ...history,
      id: `history_${Date.now()}`,
      recordedAt: new Date(),
    };
    const updatedHistories = [...(visit.histories || []), historyRecord];
    return this.update(visitId, { histories: updatedHistories });
  }

  // Create history - convenience method
  // Accepts multiple formats: { opdVisitId, historyType, historyText } or { opdVisitId, historyType, description }
  async createHistory(data: { opdVisitId: string; historyType: string; historyText?: string; description?: string }): Promise<any> {
    const visit = await this.getById(data.opdVisitId);
    if (!visit) throw new Error('Visit not found');
    
    const historyRecord = {
      id: `history_${Date.now()}`,
      visitId: data.opdVisitId,
      historyType: data.historyType as ClinicalHistory['historyType'],
      description: data.historyText || data.description || '',
      recordedAt: new Date(),
    };
    const updatedHistories = [...(visit.histories || []), historyRecord];
    await this.update(data.opdVisitId, { histories: updatedHistories });
    return historyRecord;
  }

  // Get histories by visit - convenience method
  async getHistoryByVisit(visitId: string): Promise<ClinicalHistory[]> {
    const visit = await this.getById(visitId);
    return visit?.histories || [];
  }

  // Get histories by visit (alias)
  async getHistoriesByVisit(visitId: string): Promise<ClinicalHistory[]> {
    const visit = await this.getById(visitId);
    return visit?.histories || [];
  }

  // ============== NOTES METHODS ==============

  // Add clinical note
  async addNote(visitId: string, note: Omit<ClinicalNote, 'id' | 'recordedAt'>): Promise<void> {
    const visit = await this.getById(visitId);
    if (!visit) throw new Error('Visit not found');
    
    const noteRecord: ClinicalNote = {
      ...note,
      id: `note_${Date.now()}`,
      recordedAt: new Date(),
    };
    const updatedNotes = [...(visit.notes || []), noteRecord];
    return this.update(visitId, { notes: updatedNotes });
  }

  // Create note - convenience method
  // Accepts multiple formats: { opdVisitId, noteType, noteText } or { visitId, noteType, content }
  async createNote(data: { opdVisitId?: string; visitId?: string; noteType: string; noteText?: string; content?: string; patientId?: string }): Promise<any> {
    const vId = data.opdVisitId || data.visitId;
    if (!vId) throw new Error('Visit ID is required');
    
    const visit = await this.getById(vId);
    if (!visit) throw new Error('Visit not found');
    
    const noteRecord = {
      id: `note_${Date.now()}`,
      visitId: vId,
      noteType: data.noteType as ClinicalNote['noteType'],
      noteText: data.noteText || data.content || '',
      content: data.noteText || data.content || '', // Alias for compatibility
      recordedAt: new Date(),
    };
    const updatedNotes = [...(visit.notes || []), noteRecord];
    await this.update(vId, { notes: updatedNotes });
    return noteRecord;
  }

  // Get notes by visit - convenience method
  async getNotesByVisit(visitId: string): Promise<ClinicalNote[]> {
    const visit = await this.getById(visitId);
    return visit?.notes || [];
  }

  // ============== DIAGNOSIS METHODS ==============

  // Add diagnosis
  async addDiagnosis(visitId: string, diagnosis: Omit<Diagnosis, 'id' | 'recordedAt'>): Promise<void> {
    const visit = await this.getById(visitId);
    if (!visit) throw new Error('Visit not found');
    
    const diagnosisRecord: Diagnosis = {
      ...diagnosis,
      id: `diagnosis_${Date.now()}`,
      recordedAt: new Date(),
    };
    const updatedDiagnoses = [...(visit.diagnoses || []), diagnosisRecord];
    return this.update(visitId, { diagnoses: updatedDiagnoses });
  }

  // Create diagnosis - convenience method
  // Accepts multiple formats for compatibility
  async createDiagnosis(data: { 
    opdVisitId?: string; 
    visitId?: string; 
    diagnosisType: string; 
    diagnosisText?: string; 
    diagnosisName?: string;
    icdCode?: string; 
    diagnosisCode?: string;
    patientId?: string;
  }): Promise<any> {
    const vId = data.opdVisitId || data.visitId;
    if (!vId) throw new Error('Visit ID is required');
    
    const visit = await this.getById(vId);
    if (!visit) throw new Error('Visit not found');
    
    const diagnosisRecord = {
      id: `diagnosis_${Date.now()}`,
      visitId: vId,
      diagnosisType: data.diagnosisType as Diagnosis['diagnosisType'],
      diagnosisText: data.diagnosisText || data.diagnosisName || '',
      icdCode: data.icdCode || data.diagnosisCode,
      recordedAt: new Date(),
    };
    const updatedDiagnoses = [...(visit.diagnoses || []), diagnosisRecord];
    await this.update(vId, { diagnoses: updatedDiagnoses });
    return diagnosisRecord;
  }

  // Get diagnoses by visit - convenience method
  async getDiagnosisByVisit(visitId: string): Promise<Diagnosis[]> {
    const visit = await this.getById(visitId);
    return visit?.diagnoses || [];
  }

  // Get diagnoses by visit (alias)
  async getDiagnosesByVisit(visitId: string): Promise<Diagnosis[]> {
    const visit = await this.getById(visitId);
    return visit?.diagnoses || [];
  }

  // ============== PRESCRIPTION METHODS ==============

  // Add prescription
  async addPrescription(visitId: string, prescription: Omit<Prescription, 'id' | 'prescribedAt'>): Promise<void> {
    const visit = await this.getById(visitId);
    if (!visit) throw new Error('Visit not found');
    
    const prescriptionRecord: Prescription = {
      ...prescription,
      id: `prescription_${Date.now()}`,
      prescribedAt: new Date(),
    };
    const updatedPrescriptions = [...(visit.prescriptions || []), prescriptionRecord];
    return this.update(visitId, { prescriptions: updatedPrescriptions });
  }

  // Create prescription - convenience method
  // Accepts multiple formats for compatibility
  async createPrescription(data: { opdVisitId?: string; visitId?: string; items: any[]; notes?: string; patientId?: string }): Promise<any> {
    const vId = data.opdVisitId || data.visitId;
    if (!vId) throw new Error('Visit ID is required');
    
    const visit = await this.getById(vId);
    if (!visit) throw new Error('Visit not found');
    
    const prescriptionRecord = {
      id: `prescription_${Date.now()}`,
      visitId: vId,
      items: data.items,
      notes: data.notes,
      prescribedAt: new Date(),
    };
    const updatedPrescriptions = [...(visit.prescriptions || []), prescriptionRecord];
    await this.update(vId, { prescriptions: updatedPrescriptions });
    return prescriptionRecord;
  }

  // Get prescriptions by visit - convenience method
  async getPrescriptionsByVisit(visitId: string): Promise<Prescription[]> {
    const visit = await this.getById(visitId);
    return visit?.prescriptions || [];
  }

  // ============== ADVICE METHODS ==============

  // Update advice - convenience method
  async updateVisitAdvice(
    visitId: string,
    advice: {
      generalAdvice?: string;
      dietaryAdvice?: string;
      activityAdvice?: string;
      followUpPlan?: string;
      followUpDate?: string;
      chiefComplaint?: string;
    }
  ): Promise<void> {
    // Filter out undefined values - Firestore doesn't accept undefined
    const cleanedAdvice: Record<string, string> = {};
    Object.entries(advice).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanedAdvice[key] = value;
      }
    });
    
    // Only update if there's something to update
    if (Object.keys(cleanedAdvice).length > 0) {
      return this.update(visitId, cleanedAdvice as any);
    }
  }

  // Update advice (alias)
  async updateAdvice(
    visitId: string,
    advice: {
      generalAdvice?: string;
      dietaryAdvice?: string;
      activityAdvice?: string;
      followUpPlan?: string;
      followUpDate?: string;
    }
  ): Promise<void> {
    // Filter out undefined values - Firestore doesn't accept undefined
    const cleanedAdvice: Record<string, string> = {};
    Object.entries(advice).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanedAdvice[key] = value;
      }
    });
    
    // Only update if there's something to update
    if (Object.keys(cleanedAdvice).length > 0) {
      return this.update(visitId, cleanedAdvice as any);
    }
  }

  // ============== COMPLETION METHODS ==============

  // Complete visit with all data
  async completeVisit(
    visitId: string,
    data: Partial<Visit>
  ): Promise<void> {
    return this.update(visitId, {
      ...data,
      visitStatus: 'COMPLETED',
    });
  }

  // Generate PDF - stub for now (would need backend or client-side PDF generation)
  async generatePDF(_visitId: string): Promise<Blob> {
    // This would typically call a backend service or generate client-side
    // For now, return empty blob - actual PDF generation is handled in component
    throw new Error('PDF generation should be handled client-side with jsPDF');
  }

  // ============== LEGACY COMPATIBILITY METHODS ==============

  // Get vitals by patient (legacy - returns vitals from all patient visits)
  async getVitalsByPatient(patientId: string, options?: { limit?: number }): Promise<VitalRecord[]> {
    const visits = await this.getPatientVisitsByDoctor(patientId);
    const allVitals: VitalRecord[] = [];
    
    for (const visit of visits) {
      if (visit.vitals) {
        allVitals.push(...visit.vitals);
      }
    }
    
    // Sort by recordedAt descending and apply limit
    allVitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    
    if (options?.limit) {
      return allVitals.slice(0, options.limit);
    }
    return allVitals;
  }

  // Create vitals record
  async createVitals(data: { 
    visitId: string; 
    vitals: Partial<VitalRecord>;
  }): Promise<VitalRecord> {
    const visit = await this.getById(data.visitId);
    if (!visit) throw new Error('Visit not found');
    
    // Convert flat vitals to details array format
    const details: Vital[] = [];
    if (data.vitals.temperature) details.push({ vitalName: 'Temperature', vitalValue: data.vitals.temperature, vitalUnit: '°F' });
    if (data.vitals.bloodPressureSystolic) details.push({ vitalName: 'BP Systolic', vitalValue: data.vitals.bloodPressureSystolic, vitalUnit: 'mmHg' });
    if (data.vitals.bloodPressureDiastolic) details.push({ vitalName: 'BP Diastolic', vitalValue: data.vitals.bloodPressureDiastolic, vitalUnit: 'mmHg' });
    if (data.vitals.pulseRate) details.push({ vitalName: 'Pulse Rate', vitalValue: data.vitals.pulseRate, vitalUnit: 'bpm' });
    if (data.vitals.respiratoryRate) details.push({ vitalName: 'Respiratory Rate', vitalValue: data.vitals.respiratoryRate, vitalUnit: '/min' });
    if (data.vitals.oxygenSaturation) details.push({ vitalName: 'SpO2', vitalValue: data.vitals.oxygenSaturation, vitalUnit: '%' });
    if (data.vitals.weight) details.push({ vitalName: 'Weight', vitalValue: data.vitals.weight, vitalUnit: 'kg' });
    if (data.vitals.height) details.push({ vitalName: 'Height', vitalValue: data.vitals.height, vitalUnit: 'cm' });
    
    // Also add any existing details
    if (data.vitals.details) {
      details.push(...data.vitals.details);
    }
    
    const vitalRecord: VitalRecord = {
      id: `vitals_${Date.now()}`,
      visitId: data.visitId,
      recordedAt: new Date(),
      recordedBy: data.vitals.recordedBy || 'unknown',
      details,
      ...data.vitals,
    };
    
    const updatedVitals = [...(visit.vitals || []), vitalRecord];
    await this.update(data.visitId, { vitals: updatedVitals });
    return vitalRecord;
  }

  // Get diagnosis by patient (legacy - returns diagnoses from all patient visits)
  async getDiagnosisByPatient(patientId: string): Promise<Diagnosis[]> {
    const visits = await this.getPatientVisitsByDoctor(patientId);
    const allDiagnoses: Diagnosis[] = [];
    
    for (const visit of visits) {
      if (visit.diagnoses) {
        allDiagnoses.push(...visit.diagnoses);
      }
    }
    
    return allDiagnoses.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }

  // Get prescriptions by patient (legacy - returns prescriptions from all patient visits)
  async getPrescriptionsByPatient(patientId: string, page: number = 1, limit: number = 10, doctorId?: string): Promise<{ data: Prescription[]; total: number }> {
    const visits = await this.getPatientVisitsByDoctor(patientId, doctorId);
    const allPrescriptions: Prescription[] = [];
    
    for (const visit of visits) {
      // Check if prescriptions exist in opdVisit (the actual visit data)
      const visitData = visit.opdVisit || visit;
      if (visitData.prescriptions && Array.isArray(visitData.prescriptions)) {
        // Flatten prescription items from all prescriptions in this visit
        visitData.prescriptions.forEach((prescription: any) => {
          if (prescription.items && prescription.items.length > 0) {
            allPrescriptions.push({
              ...prescription,
              visitDate: visitData.visitDate || visit.appointmentDate,
            });
          }
        });
      }
    }
    
    // Sort by prescribedAt or visitDate descending
    allPrescriptions.sort((a, b) => {
      const dateA = new Date((a as any).prescribedAt || (a as any).visitDate || '').getTime();
      const dateB = new Date((b as any).prescribedAt || (b as any).visitDate || '').getTime();
      return dateB - dateA;
    });
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedData = allPrescriptions.slice(startIndex, startIndex + limit);
    
    return {
      data: paginatedData,
      total: allPrescriptions.length
    };
  }

  // ============== TEMPLATE METHODS (simplified - stored per user) ==============
  
  private _templates: Map<string, { id: string; name: string; items: any[] }[]> = new Map();

  // Get prescription templates for current user
  async getTemplates(): Promise<{ id: string; name: string; items: any[] }[]> {
    // In a full implementation, these would be stored in Firestore
    // For now, return from in-memory storage
    const doctorId = 'current'; // Would get from auth context
    return this._templates.get(doctorId) || [];
  }

  // Create prescription template
  async createTemplate(data: { name: string; items: any[] }): Promise<{ id: string; name: string; items: any[] }> {
    const doctorId = 'current';
    const template = {
      id: `template_${Date.now()}`,
      name: data.name,
      items: data.items,
    };
    
    const existing = this._templates.get(doctorId) || [];
    this._templates.set(doctorId, [...existing, template]);
    
    return template;
  }

  // Update prescription template
  async updateTemplate(templateId: string, data: { name?: string; items?: any[] }): Promise<void> {
    const doctorId = 'current';
    const templates = this._templates.get(doctorId) || [];
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index !== -1) {
      templates[index] = { ...templates[index], ...data };
      this._templates.set(doctorId, templates);
    }
  }

  // Delete prescription template
  async deleteTemplate(templateId: string): Promise<void> {
    const doctorId = 'current';
    const templates = this._templates.get(doctorId) || [];
    this._templates.set(doctorId, templates.filter(t => t.id !== templateId));
  }
}

export const consultationService = new ConsultationService();