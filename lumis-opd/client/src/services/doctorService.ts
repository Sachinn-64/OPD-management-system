import { FirestoreService, COLLECTIONS, Doctor } from '../lib/firebase';
import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';

export type { Doctor };

// Interface for user document with doctor role
interface UserDoc {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  clinicId?: string;
  // Doctor-specific fields stored in user doc
  firstName?: string;
  lastName?: string;
  specialty?: string;
  registrationNumber?: string;
  qualification?: string;
  consultationFee?: number;
  customFrequencies?: string[];
  createdAt?: any;
  updatedAt?: any;
}

// Convert user doc to Doctor type
const userToDoctor = (user: UserDoc): Doctor => {
  return {
    id: user.id,
    userId: user.id,
    firstName: user.firstName || user.username?.split(' ')[0] || '',
    lastName: user.lastName || user.username?.split(' ').slice(1).join(' ') || '',
    email: user.email,
    specialty: user.specialty || 'General Medicine',
    registrationNumber: user.registrationNumber || '',
    qualification: user.qualification || '',
    consultationFee: user.consultationFee || 0,
    isActive: user.isActive !== false,
    customFrequencies: user.customFrequencies || [],
    createdAt: user.createdAt?.toDate?.() || new Date(),
    updatedAt: user.updatedAt?.toDate?.() || new Date(),
  } as Doctor;
};

// Debug function to check Firestore doctors from users collection
export const debugDoctors = async () => {
  console.log('=== DEBUG DOCTORS (from users) ===');
  console.log('Collection path:', COLLECTIONS.USERS);

  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);
    console.log('Total users:', snapshot.size);

    const doctors: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('User doc:', doc.id, data);
      if (data.role === 'doctor') {
        doctors.push({ id: doc.id, ...data });
      }
    });

    console.log('Doctors found:', doctors.length);
    return doctors;
  } catch (err) {
    console.error('Debug error:', err);
    return [];
  }
};

// Helper to create a test doctor (for development)
export const createTestDoctor = async (): Promise<Doctor> => {
  const testDoctor: UserDoc = {
    id: '',
    email: 'test.doctor@lumis.com',
    username: 'Test Doctor',
    role: 'doctor',
    isActive: true,
    firstName: 'Test',
    lastName: 'Doctor',
    specialty: 'General Medicine',
    registrationNumber: 'DOC001',
    qualification: 'MBBS',
    consultationFee: 500,
  };

  const service = new FirestoreService<UserDoc>(COLLECTIONS.USERS);
  const id = await service.create(testDoctor as any);
  return userToDoctor({ ...testDoctor, id });
};

class DoctorService {
  // Get all active doctors from users collection where role = 'doctor'
  async getAll(): Promise<Doctor[]> {
    try {
      console.log('=== DoctorService.getAll() from users ===');

      const usersRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await getDocs(usersRef);

      console.log('Total users:', snapshot.size);

      const doctors: Doctor[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserDoc;
        if (data.role === 'doctor' && data.isActive !== false) {
          console.log('Found doctor:', docSnap.id, data);
          doctors.push(userToDoctor({ ...data, id: docSnap.id }));
        }
      });

      console.log('Doctors found:', doctors.length);

      // Sort by firstName
      return doctors.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    } catch (err) {
      console.error('Error fetching doctors:', err);
      throw err;
    }
  }

  // Get doctor by ID (from users collection)
  async getById(doctorId: string): Promise<Doctor | null> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, doctorId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data() as UserDoc;
      if (data.role !== 'doctor') return null;

      return userToDoctor({ ...data, id: docSnap.id });
    } catch (err) {
      console.error('Error fetching doctor by ID:', err);
      return null;
    }
  }

  // Get doctor by user ID (same as getById for this implementation)
  async getByUserId(userId: string): Promise<Doctor | null> {
    return this.getById(userId);
  }

  // Create a new doctor (adds to users collection with role = 'doctor')
  async create(doctorData: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Doctor> {
    const userData = {
      email: doctorData.email || '',
      username: `${doctorData.firstName} ${doctorData.lastName}`,
      role: 'doctor',
      isActive: true,
      firstName: doctorData.firstName,
      lastName: doctorData.lastName,
      specialty: doctorData.specialty,
      registrationNumber: doctorData.registrationNumber,
      qualification: doctorData.qualification || '',
      consultationFee: doctorData.consultationFee || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const service = new FirestoreService<UserDoc>(COLLECTIONS.USERS);
    const id = await service.create(userData as any);

    return userToDoctor({ ...userData, id } as UserDoc);
  }

  // Get doctors by specialty
  async getBySpecialty(specialty: string): Promise<Doctor[]> {
    const allDoctors = await this.getAll();
    return allDoctors.filter(d => d.specialty === specialty);
  }

  // Update doctor (updates user document)
  async update(doctorId: string, data: Partial<Doctor>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, doctorId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  // Deactivate doctor
  async deactivate(doctorId: string): Promise<void> {
    return this.update(doctorId, { isActive: false });
  }

  // Delete doctor
  async delete(doctorId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, doctorId);
    await deleteDoc(docRef);
  }

  // Subscribe to active doctors
  subscribe(callback: (doctors: Doctor[]) => void): () => void {
    const usersRef = collection(db, COLLECTIONS.USERS);

    return onSnapshot(usersRef, (snapshot) => {
      const doctors: Doctor[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserDoc;
        if (data.role === 'doctor' && data.isActive !== false) {
          doctors.push(userToDoctor({ ...data, id: docSnap.id }));
        }
      });

      // Sort by firstName
      doctors.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
      callback(doctors);
    });
  }

  // Get patient history for a doctor (grouped by patient)
  async getPatientHistory(doctorId: string): Promise<any[]> {
    try {
      console.log('Fetching patient history for doctor:', doctorId);

      // Query appointments for this doctor instead of visits
      const appointmentService = new FirestoreService<any>(COLLECTIONS.APPOINTMENTS);
      const appointments = await appointmentService.query('doctorId', '==', doctorId);

      console.log('Found appointments:', appointments.length);

      // Group appointments by patient
      const patientMap = new Map<string, any>();

      for (const appointment of appointments) {
        const patientId = appointment.patientId;
        if (!patientId) {
          console.log('Appointment without patientId:', appointment.id);
          continue;
        }

        if (!patientMap.has(patientId)) {
          // Fetch patient data
          const patientRef = doc(db, COLLECTIONS.PATIENTS, patientId);
          const patientSnap = await getDoc(patientRef);

          if (patientSnap.exists()) {
            const patientData = { id: patientSnap.id, ...patientSnap.data() };
            patientMap.set(patientId, {
              patientId,
              patient: patientData,
              totalVisits: 1,
              lastVisitDate: appointment.appointmentDate,
            });
            console.log('Added patient:', (patientData as any).firstName, (patientData as any).lastName);
          } else {
            console.log('Patient not found:', patientId);
          }
        } else {
          // Increment visit count
          const existing = patientMap.get(patientId);
          existing.totalVisits += 1;
          // Update last visit date if this appointment is more recent
          if (new Date(appointment.appointmentDate) > new Date(existing.lastVisitDate)) {
            existing.lastVisitDate = appointment.appointmentDate;
          }
        }
      }

      const result = Array.from(patientMap.values()).sort((a, b) =>
        new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime()
      );

      console.log('Returning grouped patients:', result.length);
      return result;
    } catch (err) {
      console.error('Error fetching patient history:', err);
      return [];
    }
  }

  // Legacy methods for compatibility (ignore clinicId parameter)
  setClinicId(_clinicId: string) {
    // No-op for compatibility
  }
}

export const doctorService = new DoctorService();
