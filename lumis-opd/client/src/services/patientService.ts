import { FirestoreService, where, orderBy, Timestamp, limit as firestoreLimit, COLLECTIONS, Patient } from '../lib/firebase';
import { db } from '../config/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';

export type { Patient };

// Exported type for components
export type CreatePatientData = Omit<Patient, 'id' | 'uhid' | 'createdAt' | 'updatedAt'>;

class PatientService {
  private getService() {
    return new FirestoreService<Patient>(COLLECTIONS.PATIENTS);
  }

  // Generate UHID for new patient
  private async generateUHID(): Promise<string> {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Get count of patients registered this month
    const patientsRef = collection(db, COLLECTIONS.PATIENTS);
    const q = query(
      patientsRef,
      where('createdAt', '>=', Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), 1))),
      where('createdAt', '<', Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth() + 1, 1)))
    );
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    
    return `${datePrefix}${String(count).padStart(4, '0')}`;
  }

  // Create a new patient
  async create(patientData: Omit<Patient, 'id' | 'uhid' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const service = this.getService();
    const uhid = await this.generateUHID();
    
    const id = await service.create({
      ...patientData,
      uhid,
    } as any);
    
    return {
      id,
      ...patientData,
      uhid,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Patient;
  }

  // Get patient by ID
  async getById(patientId: string): Promise<Patient | null> {
    return this.getService().getById(patientId);
  }

  // Get patient by UHID
  async getByUHID(uhid: string): Promise<Patient | null> {
    const patients = await this.getService().query('uhid', '==', uhid);
    return patients.length > 0 ? patients[0] : null;
  }

  // Search patients
  async search(queryText: string): Promise<Patient[]> {
    const service = this.getService();
    
    // Check if query is phone number (digits)
    if (/^\d+$/.test(queryText)) {
      return service.query('phone', '==', queryText);
    }
    
    // Check if query is UHID (starts with year)
    if (/^\d{6}/.test(queryText)) {
      return service.query('uhid', '==', queryText);
    }
    
    // For names, fetch recent patients and filter client-side 
    const recentPatients = await service.getAll([
      orderBy('createdAt', 'desc'),
      firestoreLimit(100)
    ]);
    
    const lowerQuery = queryText.toLowerCase();
    return recentPatients.filter(p => 
      p.firstName.toLowerCase().includes(lowerQuery) || 
      p.lastName.toLowerCase().includes(lowerQuery)
    );
  }

  // Get all patients with pagination
  async getAll(options?: { limit?: number }): Promise<Patient[]> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    
    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }
    
    return this.getService().getAll(constraints);
  }

  // Update patient
  async update(patientId: string, data: Partial<Patient>): Promise<void> {
    return this.getService().update(patientId, data);
  }

  // Delete patient
  async delete(patientId: string): Promise<void> {
    return this.getService().delete(patientId);
  }

  // Legacy method for compatibility (ignore clinicId parameter)
  setClinicId(_clinicId: string) {
    // No-op for compatibility
  }
}

export const patientService = new PatientService();
