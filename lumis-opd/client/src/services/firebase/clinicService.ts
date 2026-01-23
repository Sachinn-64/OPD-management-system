import { FirestoreService, COLLECTIONS, Clinic } from '../../lib/firebase';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

class ClinicService {
  private service = new FirestoreService<Clinic>(COLLECTIONS.CLINICS);

  /**
   * Create a new clinic
   * Returns the clinicId
   */
  async create(clinicData: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const clinicId = await this.service.create({
      ...clinicData,
    } as any);

    return clinicId;
  }

  /**
   * Get clinic by ID
   */
  async getById(clinicId: string): Promise<Clinic | null> {
    return this.service.getById(clinicId);
  }

  /**
   * Update clinic information
   */
  async update(clinicId: string, data: Partial<Clinic>): Promise<void> {
    return this.service.update(clinicId, data);
  }

  /**
   * Check if clinic email already exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const clinicsRef = collection(db, COLLECTIONS.CLINICS);
    const q = query(clinicsRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Get clinic by email
   */
  async getByEmail(email: string): Promise<Clinic | null> {
    const clinicsRef = collection(db, COLLECTIONS.CLINICS);
    const q = query(clinicsRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Clinic;
  }

  /**
   * Update subscription status
   */
  async updateSubscription(
    clinicId: string,
    status: 'active' | 'inactive' | 'trial',
    endDate?: Date
  ): Promise<void> {
    const updateData: any = {
      subscriptionStatus: status,
      updatedAt: Timestamp.now(),
    };

    if (endDate) {
      updateData.subscriptionEndDate = Timestamp.fromDate(endDate);
    }

    await updateDoc(doc(db, COLLECTIONS.CLINICS, clinicId), updateData);
  }

  /**
   * Get all clinics (admin only)
   */
  async getAll(): Promise<Clinic[]> {
    return this.service.getAll();
  }

  /**
   * Deactivate clinic
   */
  async deactivate(clinicId: string): Promise<void> {
    return this.updateSubscription(clinicId, 'inactive');
  }

  /**
   * Activate clinic
   */
  async activate(clinicId: string, endDate: Date): Promise<void> {
    return this.updateSubscription(clinicId, 'active', endDate);
  }
}

export const clinicFirebaseService = new ClinicService();
