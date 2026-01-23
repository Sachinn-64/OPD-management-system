import { FirestoreService, where, orderBy, limit as firestoreLimit, COLLECTIONS, Appointment, Visit } from '../lib/firebase';
import type { QueryConstraint } from 'firebase/firestore';

export type { Appointment };

// Flat collection service - no clinic nesting
const getService = () => new FirestoreService<Appointment>(COLLECTIONS.APPOINTMENTS);
const getVisitService = () => new FirestoreService<Visit>(COLLECTIONS.VISITS);

class AppointmentService {
  // Create a new appointment
  async create(
    appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    const service = getService();
    
    // Set default status if not provided
    const dataWithDefaults = {
      ...appointmentData,
      status: appointmentData.status || 'SCHEDULED',
      paymentStatus: appointmentData.paymentStatus || 'pending',
      appointmentTime: appointmentData.appointmentTime || new Date().toTimeString().slice(0, 5),
    };
    
    const id = await service.create(dataWithDefaults as any);
    
    console.log('Appointment created:', id, dataWithDefaults);
    
    return {
      id,
      ...dataWithDefaults,
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
    try {
      console.log('Fetching appointments for date:', date);
      const results = await getService().query('appointmentDate', '==', date);
      console.log('Appointments found:', results.length);
      return results;
    } catch (err) {
      console.error('Error fetching appointments by date:', err);
      return [];
    }
  }

  // Get today's appointments
  async getToday(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  }

  // Get appointments for a specific doctor
  async getByDoctor(doctorId: string, date?: string): Promise<Appointment[]> {
    try {
      // Simple query without composite index
      const allAppointments = await getService().query('doctorId', '==', doctorId);
      let results = allAppointments;
      
      if (date) {
        results = results.filter(a => a.appointmentDate === date);
      }
      
      // Sort in memory
      return results.sort((a, b) => {
        const timeA = a.appointmentTime || '';
        const timeB = b.appointmentTime || '';
        return timeA.localeCompare(timeB);
      });
    } catch (err) {
      console.error('Error fetching doctor appointments:', err);
      return [];
    }
  }

  // Get today's queue (alias for getByDoctor with today's date)
  async getTodayQueue(doctorId: string): Promise<Appointment[]> {
     const today = new Date().toISOString().split('T')[0];
     return this.getByDoctor(doctorId, today);
  }

  // Get appointments for a specific patient
  async getByPatient(patientId: string): Promise<Appointment[]> {
    try {
      const results = await getService().query('patientId', '==', patientId);
      // Sort by date in memory
      return results.sort((a, b) => {
        const dateA = a.appointmentDate || '';
        const dateB = b.appointmentDate || '';
        return dateB.localeCompare(dateA); // desc order
      });
    } catch (err) {
      console.error('Error fetching patient appointments:', err);
      return [];
    }
  }

  // Get all appointments
  async getAll(options?: { limit?: number; date?: string }): Promise<Appointment[]> {
    try {
      const constraints: QueryConstraint[] = [];
      if (options?.date) {
        constraints.push(where('appointmentDate', '==', options.date));
      }
      // Use single orderBy to avoid composite index requirement
      constraints.push(orderBy('createdAt', 'desc'));
      
      if (options?.limit) {
        constraints.push(firestoreLimit(options.limit));
      }
      
      const results = await getService().getAll(constraints);
      console.log('Appointments fetched:', results.length, results);
      return results;
    } catch (err) {
      console.error('Error fetching appointments:', err);
      // Fallback: try without orderBy
      try {
        const results = await getService().getAll([]);
        console.log('Appointments fetched (fallback):', results.length);
        // Filter by date if needed
        if (options?.date) {
          return results.filter(a => a.appointmentDate === options.date);
        }
        return results;
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        return [];
      }
    }
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

  // =========== CONVENIENCE METHODS (aliases for backward compatibility) ===========

  async createAppointment(
    appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    return this.create(appointmentData);
  }

  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    return this.getById(appointmentId);
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return this.getByDate(date);
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    return this.getToday();
  }

  async getAppointmentsByDoctor(doctorId: string, date?: string): Promise<Appointment[]> {
    return this.getByDoctor(doctorId, date);
  }

  async getDoctorTodayQueue(doctorId: string): Promise<Appointment[]> {
    return this.getTodayQueue(doctorId);
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return this.getByPatient(patientId);
  }

  async getAllAppointments(options?: { limit?: number; date?: string }): Promise<Appointment[]> {
    return this.getAll(options);
  }

  async updateAppointment(appointmentId: string, data: Partial<Appointment>): Promise<void> {
    return this.update(appointmentId, data);
  }

  async updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
    return this.updateStatus(appointmentId, status);
  }

  async checkInPatient(appointmentId: string): Promise<void> {
    return this.checkIn(appointmentId);
  }

  // Update visit status
  async updateVisitStatus(visitId: string, visitStatus: Visit['visitStatus']): Promise<void> {
    return getVisitService().update(visitId, { visitStatus });
  }
}

export const appointmentService = new AppointmentService();