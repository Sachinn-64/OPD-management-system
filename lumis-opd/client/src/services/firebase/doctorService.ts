import { FirestoreService, where, orderBy, COLLECTIONS, Doctor } from '../../lib/firebase';

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Doctor>(COLLECTIONS.DOCTORS);

class DoctorService {
  // Create a new doctor
  async create(
    doctorData: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Doctor> {
    const service = getService();
    
    const id = await service.create({
      ...doctorData,
      isActive: true,
    } as any);
    
    return {
      id,
      ...doctorData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Get doctor by ID
  async getById(doctorId: string): Promise<Doctor | null> {
    return getService().getById(doctorId);
  }

  // Get doctor by user ID
  async getByUserId(userId: string): Promise<Doctor | null> {
    const doctors = await getService().query('userId', '==', userId);
    return doctors.length > 0 ? doctors[0] : null;
  }

  // Get all active doctors
  async getAll(): Promise<Doctor[]> {
    return getService().getAll([
      where('isActive', '==', true),
      orderBy('firstName', 'asc'),
    ]);
  }

  // Get doctors by specialty
  async getBySpecialty(specialty: string): Promise<Doctor[]> {
    return getService().getAll([
      where('specialty', '==', specialty),
      where('isActive', '==', true),
      orderBy('firstName', 'asc'),
    ]);
  }

  // Update doctor
  async update(doctorId: string, data: Partial<Doctor>): Promise<void> {
    return getService().update(doctorId, data);
  }

  // Deactivate doctor
  async deactivate(doctorId: string): Promise<void> {
    return this.update(doctorId, { isActive: false });
  }

  // Delete doctor
  async delete(doctorId: string): Promise<void> {
    return getService().delete(doctorId);
  }

  // Subscribe to doctor list
  subscribe(callback: (doctors: Doctor[]) => void): () => void {
    return getService().subscribe(callback, [
      where('isActive', '==', true),
      orderBy('firstName', 'asc'),
    ]);
  }
}

export const doctorFirebaseService = new DoctorService();
