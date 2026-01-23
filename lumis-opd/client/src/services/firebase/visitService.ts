import { FirestoreService, where, orderBy, COLLECTIONS, Visit, VitalRecord, ClinicalHistory, ClinicalNote, Diagnosis, Prescription } from '../../lib/firebase';
import type { QueryConstraint } from 'firebase/firestore';

class VisitService {
  private getService(clinicId: string) {
    return new FirestoreService<Visit>(COLLECTIONS.VISITS(clinicId));
  }

  // Create a new visit (usually created when appointment is checked in)
  async create(
    clinicId: string,
    visitData: Omit<Visit, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>
  ): Promise<Visit> {
    const service = this.getService(clinicId);
    
    const id = await service.create({
      ...visitData,
      clinicId,
      visitStatus: visitData.visitStatus || 'OPEN',
      vitals: [],
      histories: [],
      notes: [],
      diagnoses: [],
      prescriptions: [],
    } as any);
    
    return {
      id,
      ...visitData,
      clinicId,
      visitStatus: visitData.visitStatus || 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Get visit by ID
  async getById(clinicId: string, visitId: string): Promise<Visit | null> {
    return this.getService(clinicId).getById(visitId);
  }

  // Get visit by appointment ID
  async getByAppointment(clinicId: string, appointmentId: string): Promise<Visit | null> {
    const visits = await this.getService(clinicId).query('appointmentId', '==', appointmentId);
    return visits.length > 0 ? visits[0] : null;
  }

  // Get visits for a patient
  async getByPatient(clinicId: string, patientId: string): Promise<Visit[]> {
    return this.getService(clinicId).getAll([
      where('patientId', '==', patientId),
      orderBy('visitDate', 'desc'),
    ]);
  }

  // Get visits for a doctor
  async getByDoctor(clinicId: string, doctorId: string, date?: string): Promise<Visit[]> {
    const constraints: QueryConstraint[] = [where('doctorId', '==', doctorId)];
    if (date) {
      constraints.push(where('visitDate', '==', date));
    }
    constraints.push(orderBy('visitDate', 'desc'));
    return this.getService(clinicId).getAll(constraints);
  }

  // Get patient visits by doctor (for patient history)
  async getPatientVisitsByDoctor(clinicId: string, patientId: string, doctorId: string): Promise<Visit[]> {
    return this.getService(clinicId).getAll([
      where('patientId', '==', patientId),
      where('doctorId', '==', doctorId),
      orderBy('visitDate', 'desc'),
    ]);
  }

  // Update visit
  async update(clinicId: string, visitId: string, data: Partial<Visit>): Promise<void> {
    return this.getService(clinicId).update(visitId, data);
  }

  // Update visit status
  async updateStatus(clinicId: string, visitId: string, status: Visit['visitStatus']): Promise<void> {
    return this.update(clinicId, visitId, { visitStatus: status });
  }

  // Add vitals to visit
  async addVitals(clinicId: string, visitId: string, vitals: VitalRecord): Promise<void> {
    const visit = await this.getById(clinicId, visitId);
    if (!visit) throw new Error('Visit not found');
    
    const updatedVitals = [...(visit.vitals || []), vitals];
    return this.update(clinicId, visitId, { vitals: updatedVitals });
  }

  // Add clinical history
  async addHistory(clinicId: string, visitId: string, history: ClinicalHistory): Promise<void> {
    const visit = await this.getById(clinicId, visitId);
    if (!visit) throw new Error('Visit not found');
    
    const updatedHistories = [...(visit.histories || []), { ...history, recordedAt: new Date() }];
    return this.update(clinicId, visitId, { histories: updatedHistories });
  }

  // Add clinical note
  async addNote(clinicId: string, visitId: string, note: ClinicalNote): Promise<void> {
    const visit = await this.getById(clinicId, visitId);
    if (!visit) throw new Error('Visit not found');
    
    const updatedNotes = [...(visit.notes || []), { ...note, recordedAt: new Date() }];
    return this.update(clinicId, visitId, { notes: updatedNotes });
  }

  // Add diagnosis
  async addDiagnosis(clinicId: string, visitId: string, diagnosis: Diagnosis): Promise<void> {
    const visit = await this.getById(clinicId, visitId);
    if (!visit) throw new Error('Visit not found');
    
    const updatedDiagnoses = [...(visit.diagnoses || []), { ...diagnosis, recordedAt: new Date() }];
    return this.update(clinicId, visitId, { diagnoses: updatedDiagnoses });
  }

  // Add prescription
  async addPrescription(clinicId: string, visitId: string, prescription: Prescription): Promise<void> {
    const visit = await this.getById(clinicId, visitId);
    if (!visit) throw new Error('Visit not found');
    
    const updatedPrescriptions = [...(visit.prescriptions || []), { ...prescription, prescribedAt: new Date() }];
    return this.update(clinicId, visitId, { prescriptions: updatedPrescriptions });
  }

  // Update advice
  async updateAdvice(
    clinicId: string,
    visitId: string,
    advice: {
      generalAdvice?: string;
      dietaryAdvice?: string;
      activityAdvice?: string;
      followUpPlan?: string;
      followUpDate?: string;
    }
  ): Promise<void> {
    return this.update(clinicId, visitId, advice);
  }

  // Complete visit with all data
  async completeVisit(
    clinicId: string,
    visitId: string,
    data: {
      chiefComplaint?: string;
      histories?: ClinicalHistory[];
      notes?: ClinicalNote[];
      diagnoses?: Diagnosis[];
      prescriptions?: Prescription[];
      generalAdvice?: string;
      dietaryAdvice?: string;
      activityAdvice?: string;
      followUpPlan?: string;
    }
  ): Promise<void> {
    return this.update(clinicId, visitId, {
      ...data,
      visitStatus: 'COMPLETED',
    });
  }

  // Subscribe to visits for a doctor today
  subscribeDoctorToday(
    clinicId: string,
    doctorId: string,
    callback: (visits: Visit[]) => void
  ): () => void {
    const today = new Date().toISOString().split('T')[0];
    return this.getService(clinicId).subscribe(callback, [
      where('doctorId', '==', doctorId),
      where('visitDate', '==', today),
      orderBy('createdAt', 'asc'),
    ]);
  }
}

export const visitFirebaseService = new VisitService();
