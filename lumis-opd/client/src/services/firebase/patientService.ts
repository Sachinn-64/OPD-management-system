import { FirestoreService, where, orderBy, Timestamp, limit as firestoreLimit, COLLECTIONS, Patient } from '../../lib/firebase';
import { db } from '../../config/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Patient>(COLLECTIONS.PATIENTS);

class PatientService {
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
    const service = getService();
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
    };
  }

  // Get patient by ID
  async getById(patientId: string): Promise<Patient | null> {
    return getService().getById(patientId);
  }

  // Get patient by UHID
  async getByUHID(uhid: string): Promise<Patient | null> {
    const patients = await getService().query('uhid', '==', uhid);
    return patients.length > 0 ? patients[0] : null;
  }

  // Get all patients
  async getAll(options?: { limit?: number }): Promise<Patient[]> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }
    return getService().getAll(constraints);
  }

  // Search patients by name or phone
  async search(searchTerm: string): Promise<Patient[]> {
    // Firestore doesn't support full-text search, so we fetch all and filter client-side
    const patients = await this.getAll();
    const term = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(searchTerm)) ||
        p.uhid.includes(searchTerm)
    );
  }

  // Update patient
  async update(patientId: string, data: Partial<Patient>): Promise<void> {
    return getService().update(patientId, data);
  }

  // Delete patient
  async delete(patientId: string): Promise<void> {
    return getService().delete(patientId);
  }

  // Subscribe to patient list
  subscribe(callback: (patients: Patient[]) => void): () => void {
    return getService().subscribe(callback, [
      orderBy('createdAt', 'desc'),
    ]);
  }
}

export const patientFirebaseService = new PatientService();
