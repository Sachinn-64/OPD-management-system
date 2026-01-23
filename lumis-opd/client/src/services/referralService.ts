import { FirestoreService, where, orderBy, COLLECTIONS, Referral } from '../lib/firebase';

export type { Referral };

// CreateReferralData type for component compatibility
export interface CreateReferralData {
  opdVisitId: string;
  referringDoctorName: string;
  receivingDoctorName?: string;
  receivingDoctorSpeciality?: string;
  receivingDoctorHospital?: string;
  receivingDoctorPhone?: string;
  receivingDoctorEmail?: string;
  date?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  provisionalDiagnosis?: string;
  clinicalSummary?: string;
  treatmentGiven?: string;
  reasonForReferral: string;
  department?: string;
  registrationNumber?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Referral>(COLLECTIONS.REFERRALS);

class ReferralService {
  // Create new referral
  async create(referralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referral> {
    const service = getService();
    
    const id = await service.create(referralData as any);

    return {
      id,
      ...referralData,
      createdAt: new Date(),
    } as Referral;
  }

  // Convenience method for components
  async createReferral(data: CreateReferralData): Promise<Referral> {
    const referralData: Omit<Referral, 'id' | 'createdAt'> = {
      visitId: data.opdVisitId,
      patientId: '', // Will be populated from visit
      referralType: 'specialist',
      referTo: data.receivingDoctorName || '',
      specialty: data.receivingDoctorSpeciality,
      reason: data.reasonForReferral,
      priority: 'routine',
      clinicalSummary: data.clinicalSummary,
      // Additional fields stored in the document
      ...data,
    } as any;

    return this.create(referralData);
  }

  // Get referral by ID
  async getById(referralId: string): Promise<Referral | null> {
    return getService().getById(referralId);
  }

  // Get referrals by Patient
  async getByPatient(patientId: string): Promise<Referral[]> {
    return getService().getAll([
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
    ]);
  }

  // Get referrals by specific visit
  async getByVisit(visitId: string): Promise<Referral[]> {
     return getService().getAll([
      where('visitId', '==', visitId),
      orderBy('createdAt', 'desc'),
    ]);
  }

  // Convenience method for components (alias)
  async getReferralsByVisit(visitId: string): Promise<any[]> {
    return getService().getAll([
      where('visitId', '==', visitId),
    ]).catch(() => []);
  }

  // Update referral - convenience method for components
  async updateReferral(referralId: string, data: CreateReferralData): Promise<void> {
    return getService().update(referralId, {
      ...data,
      visitId: data.opdVisitId,
    } as any);
  }

  // Update referral
  async update(referralId: string, data: Partial<Referral>): Promise<void> {
    return getService().update(referralId, data);
  }
}

export const referralService = new ReferralService();