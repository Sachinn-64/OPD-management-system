import { FirestoreService, COLLECTIONS, Appointment, Visit, Patient } from '../lib/firebase';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

  // Get today's queue (with patient data and visit embedded)
  async getTodayQueue(doctorId: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    console.log('Getting today queue for doctor:', doctorId, 'date:', today);

    const appointments = await this.getByDoctor(doctorId, today);
    console.log('Appointments found:', appointments.length);

    // Fetch patient data and visit for each appointment
    const appointmentsWithData = await Promise.all(
      appointments.map(async (appointment) => {
        try {
          let patient = null;
          let opdVisit = null;

          // Fetch patient data
          if (appointment.patientId) {
            const patientDoc = await getDoc(doc(db, COLLECTIONS.PATIENTS, appointment.patientId));
            if (patientDoc.exists()) {
              patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
            }
          }

          // Fetch or create visit
          const existingVisit = await getVisitService().query('appointmentId', '==', appointment.id);
          if (existingVisit.length > 0) {
            opdVisit = existingVisit[0];
          } else {
            // Create a new visit for this appointment
            const visitId = await getVisitService().create({
              appointmentId: appointment.id!,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              visitDate: appointment.appointmentDate,
              visitStatus: 'OPEN',
            } as any);

            opdVisit = {
              id: visitId,
              appointmentId: appointment.id,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              visitDate: appointment.appointmentDate,
              visitStatus: 'OPEN' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }

          return {
            ...appointment,
            patient,
            opdVisit,
          } as Appointment;
        } catch (err) {
          console.error('Error processing appointment:', appointment.id, err);
          return {
            ...appointment,
            opdVisit: { visitStatus: 'OPEN' } as Visit,
          } as Appointment;
        }
      })
    );

    console.log('Appointments with data:', appointmentsWithData);
    return appointmentsWithData;
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
      // Fetch all appointments and filter in memory to avoid composite index issues
      const results = await getService().getAll([]);
      console.log('All appointments fetched:', results.length);

      let filtered = results;

      // Filter by date if needed
      if (options?.date) {
        console.log('Filtering by date:', options.date);
        filtered = filtered.filter(a => a.appointmentDate === options.date);
        console.log('Appointments after date filter:', filtered.length);
      }

      // Sort by createdAt desc
      filtered = filtered.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });

      // Apply limit if specified
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      console.log('Final appointments:', filtered.length, filtered.map(a => ({ id: a.id, doctorId: a.doctorId, date: a.appointmentDate })));
      return filtered;
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
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