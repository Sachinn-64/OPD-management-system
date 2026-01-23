import { FirestoreService, COLLECTIONS, Clinic } from '../../lib/firebase';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, limit as firestoreLimit, doc, getDoc } from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';

interface ClinicStats {
  clinicId: string;
  clinicName: string;
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  subscriptionStatus: string;
  subscriptionEndDate?: Date;
  createdAt: Date;
}

interface PlatformAnalytics {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  inactiveClinics: number;
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

interface SubscriptionUpdate {
  clinicId: string;
  status: 'active' | 'inactive' | 'trial';
  endDate: Date;
  paymentAmount?: number;
  paymentDate?: Date;
  invoiceNumber?: string;
}

class SuperAdminService {
  private clinicService = new FirestoreService<Clinic>(COLLECTIONS.CLINICS);

  /**
   * Get all clinics in the system
   */
  async getAllClinics(options?: { limit?: number; status?: 'active' | 'inactive' | 'trial' }): Promise<Clinic[]> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    
    if (options?.status) {
      constraints.unshift(where('subscriptionStatus', '==', options.status));
    }
    
    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }
    
    return this.clinicService.getAll(constraints);
  }

  /**
   * Get detailed stats for a specific clinic
   */
  async getClinicStats(clinicId: string): Promise<ClinicStats | null> {
    const clinic = await this.clinicService.getById(clinicId);
    if (!clinic) return null;

    // Count users
    const usersRef = collection(db, COLLECTIONS.USERS(clinicId));
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // Count doctors
    const doctorsRef = collection(db, COLLECTIONS.DOCTORS(clinicId));
    const doctorsSnapshot = await getDocs(doctorsRef);
    const totalDoctors = doctorsSnapshot.size;

    // Count patients
    const patientsRef = collection(db, COLLECTIONS.PATIENTS(clinicId));
    const patientsSnapshot = await getDocs(patientsRef);
    const totalPatients = patientsSnapshot.size;

    // Count appointments
    const appointmentsRef = collection(db, COLLECTIONS.APPOINTMENTS(clinicId));
    const appointmentsSnapshot = await getDocs(appointmentsRef);
    const totalAppointments = appointmentsSnapshot.size;

    return {
      clinicId: clinic.id!,
      clinicName: clinic.name,
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      subscriptionStatus: clinic.subscriptionStatus,
      subscriptionEndDate: clinic.subscriptionEndDate,
      createdAt: clinic.createdAt,
    };
  }

  /**
   * Get platform-wide analytics
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const allClinics = await this.getAllClinics();

    const stats = {
      totalClinics: allClinics.length,
      activeClinics: allClinics.filter(c => c.subscriptionStatus === 'active').length,
      trialClinics: allClinics.filter(c => c.subscriptionStatus === 'trial').length,
      inactiveClinics: allClinics.filter(c => c.subscriptionStatus === 'inactive').length,
      totalUsers: 0,
      totalDoctors: 0,
      totalPatients: 0,
      totalAppointments: 0,
      monthlyRevenue: 0,
      annualRevenue: 0,
    };

    // Aggregate stats from all clinics
    for (const clinic of allClinics) {
      const clinicStats = await this.getClinicStats(clinic.id!);
      if (clinicStats) {
        stats.totalUsers += clinicStats.totalUsers;
        stats.totalDoctors += clinicStats.totalDoctors;
        stats.totalPatients += clinicStats.totalPatients;
        stats.totalAppointments += clinicStats.totalAppointments;
      }
    }

    // Calculate revenue (₹10k per doctor per year for active clinics)
    stats.annualRevenue = stats.totalDoctors * 10000;
    stats.monthlyRevenue = Math.round(stats.annualRevenue / 12);

    return stats;
  }

  /**
   * Get clinics with expiring trials (within specified days)
   */
  async getExpiringTrials(daysThreshold: number = 7): Promise<Clinic[]> {
    const allClinics = await this.getAllClinics({ status: 'trial' });
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return allClinics.filter(clinic => {
      if (!clinic.subscriptionEndDate) return false;
      const endDate = new Date(clinic.subscriptionEndDate);
      return endDate <= thresholdDate && endDate > now;
    });
  }

  /**
   * Get expired clinics that should be deactivated
   */
  async getExpiredClinics(): Promise<Clinic[]> {
    const allClinics = await this.getAllClinics();
    const now = new Date();

    return allClinics.filter(clinic => {
      if (clinic.subscriptionStatus === 'inactive') return false;
      if (!clinic.subscriptionEndDate) return false;
      const endDate = new Date(clinic.subscriptionEndDate);
      return endDate < now;
    });
  }

  /**
   * Update clinic subscription
   */
  async updateSubscription(update: SubscriptionUpdate): Promise<void> {
    const updateData: any = {
      subscriptionStatus: update.status,
      subscriptionEndDate: Timestamp.fromDate(update.endDate),
      updatedAt: Timestamp.now(),
    };

    // Store payment information if provided
    if (update.paymentAmount) {
      updateData.lastPaymentAmount = update.paymentAmount;
      updateData.lastPaymentDate = update.paymentDate ? Timestamp.fromDate(update.paymentDate) : Timestamp.now();
      updateData.lastInvoiceNumber = update.invoiceNumber;
    }

    await this.clinicService.update(update.clinicId, updateData);
  }

  /**
   * Deactivate expired clinics
   */
  async deactivateExpiredClinics(): Promise<string[]> {
    const expiredClinics = await this.getExpiredClinics();
    const deactivatedIds: string[] = [];

    for (const clinic of expiredClinics) {
      await this.clinicService.update(clinic.id!, {
        subscriptionStatus: 'inactive',
        updatedAt: Timestamp.now(),
      });
      deactivatedIds.push(clinic.id!);
    }

    return deactivatedIds;
  }

  /**
   * Activate clinic with new subscription
   */
  async activateClinic(clinicId: string, durationMonths: number, paymentAmount: number): Promise<void> {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    await this.updateSubscription({
      clinicId,
      status: 'active',
      endDate,
      paymentAmount,
      paymentDate: new Date(),
      invoiceNumber: `INV-${Date.now()}`,
    });
  }

  /**
   * Search clinics by name or email
   */
  async searchClinics(searchTerm: string): Promise<Clinic[]> {
    const allClinics = await this.getAllClinics();
    const term = searchTerm.toLowerCase();
    
    return allClinics.filter(clinic =>
      clinic.name.toLowerCase().includes(term) ||
      clinic.email.toLowerCase().includes(term) ||
      clinic.phone.includes(searchTerm)
    );
  }

  /**
   * Get clinic users count by role
   */
  async getClinicUsersByRole(clinicId: string): Promise<{ admins: number; doctors: number; receptionists: number }> {
    const usersRef = collection(db, COLLECTIONS.USERS(clinicId));
    const usersSnapshot = await getDocs(usersRef);
    
    const counts = {
      admins: 0,
      doctors: 0,
      receptionists: 0,
    };

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin') counts.admins++;
      else if (data.role === 'doctor') counts.doctors++;
      else if (data.role === 'receptionist') counts.receptionists++;
    });

    return counts;
  }

  /**
   * Get recent activity across all clinics
   */
  async getRecentActivity(limit: number = 10): Promise<any[]> {
    // This would typically fetch from an activity log collection
    // For now, return recent clinics as activity
    const recentClinics = await this.getAllClinics({ limit });
    
    return recentClinics.map(clinic => ({
      type: 'clinic_registered',
      clinicId: clinic.id,
      clinicName: clinic.name,
      timestamp: clinic.createdAt,
      description: `New clinic registered: ${clinic.name}`,
    }));
  }
}

export const superAdminService = new SuperAdminService();
