import { FirestoreService, where, orderBy, limit as firestoreLimit, COLLECTIONS, Appointment } from '../../lib/firebase';
import type { QueryConstraint } from 'firebase/firestore';

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Appointment>(COLLECTIONS.APPOINTMENTS);

class AppointmentService {
  // Create a new appointment
  async create(
    appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    const service = getService();
    
    const id = await service.create(appointmentData as any);
    
    return {
      id,
      ...appointmentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Get appointment by ID
  async getById(appointmentId: string): Promise<Appointment | null> {
    return getService().getById(appointmentId);
  }

  // Get all appointments for a specific date
  async getByDate(date: string): Promise<Appointment[]> {
    return getService().query('appointmentDate', '==', date);
  }

  // Get today's appointments
  async getToday(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  }

  // Get appointments for a specific doctor
  async getByDoctor(doctorId: string, date?: string): Promise<Appointment[]> {
    const constraints: QueryConstraint[] = [where('doctorId', '==', doctorId)];
    if (date) {
      constraints.push(where('appointmentDate', '==', date));
    }
    constraints.push(orderBy('appointmentTime', 'asc'));
    return getService().getAll(constraints);
  }

  // Get appointments for a specific patient
  async getByPatient(patientId: string): Promise<Appointment[]> {
    return getService().getAll([
      where('patientId', '==', patientId),
      orderBy('appointmentDate', 'desc'),
    ]);
  }

  // Get all appointments
  async getAll(options?: { limit?: number; date?: string }): Promise<Appointment[]> {
    const constraints: QueryConstraint[] = [];
    if (options?.date) {
      constraints.push(where('appointmentDate', '==', options.date));
    }
    constraints.push(orderBy('appointmentDate', 'desc'));
    constraints.push(orderBy('appointmentTime', 'asc'));
    
    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }
    
    return getService().getAll(constraints);
  }

  // Update appointment
  async update(appointmentId: string, data: Partial<Appointment>): Promise<void> {
    return getService().update(appointmentId, data);
  }

  // Update appointment status
  async updateStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
    return this.update(appointmentId, { status });
  }

  // Check in patient
  async checkIn(appointmentId: string): Promise<void> {
    return this.updateStatus(appointmentId, 'CHECKED_IN');
  }

  // Start consultation
  async startConsultation(appointmentId: string): Promise<void> {
    return this.updateStatus(appointmentId, 'IN_PROGRESS');
  }

  // Complete consultation
  async complete(appointmentId: string): Promise<void> {
    return this.updateStatus(appointmentId, 'COMPLETED');
  }

  // Cancel appointment
  async cancel(appointmentId: string): Promise<void> {
    return this.updateStatus(appointmentId, 'CANCELLED');
  }

  // Delete appointment
  async delete(appointmentId: string): Promise<void> {
    return getService().delete(appointmentId);
  }

  // Subscribe to real-time updates for today's appointments
  subscribeToday(callback: (appointments: Appointment[]) => void): () => void {
    const today = new Date().toISOString().split('T')[0];
    return getService().subscribe(callback, [
      where('appointmentDate', '==', today),
      orderBy('appointmentTime', 'asc'),
    ]);
  }

  // Subscribe to appointments for a specific doctor today
  subscribeDoctorToday(
    doctorId: string,
    callback: (appointments: Appointment[]) => void
  ): () => void {
    const today = new Date().toISOString().split('T')[0];
    return getService().subscribe(callback, [
      where('doctorId', '==', doctorId),
      where('appointmentDate', '==', today),
      orderBy('appointmentTime', 'asc'),
    ]);
  }
}

export const appointmentFirebaseService = new AppointmentService();
