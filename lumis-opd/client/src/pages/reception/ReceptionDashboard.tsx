import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { Activity, Users, Calendar, LogOut, AlertCircle, CheckCircle, Stethoscope, Clock, TrendingUp, UserPlus, CalendarPlus, ChevronRight } from 'lucide-react';
import { HOSPITAL_INFO } from '../../config/constants';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import { AppointmentsList } from '../../components/reception/AppointmentsList';
import { PatientRegistrationModal } from '../../components/reception/PatientRegistrationModal';
import { PatientEditModal } from '../../components/reception/PatientEditModal';
import { PatientsRecordList } from '../../components/reception/PatientsRecordList';
import { AppointmentModal } from '../../components/reception/AppointmentModal';
import { DoctorCard } from '../../components/reception/DoctorCard';
import { DoctorQueueModal } from '../../components/reception/DoctorQueueModal';
import { doctorService } from '../../services/doctorService';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showPatientEditModal, setShowPatientEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showDoctorQueue, setShowDoctorQueue] = useState(false);

  // Fetch today's stats
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAppointments } = useQuery({
    queryKey: ['todayAppointments', today],
    queryFn: async () => {
      console.log('Fetching today appointments for date:', today);
      const result = await appointmentService.getAll({ date: today });
      console.log('Today appointments result:', result);
      return result;
    },
    refetchInterval: 30000,
  });

  const { data: allPatients } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => patientService.getAll({ limit: 1000 }),
  });

  const { data: allAppointments } = useQuery({
    queryKey: ['allAppointments'],
    queryFn: async () => {
      console.log('Fetching all appointments...');
      const result = await appointmentService.getAll({ limit: 1000 });
      console.log('All appointments result:', result);
      return result;
    },
    refetchInterval: 30000,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      console.log('Fetching doctors...');
      const result = await doctorService.getAll();
      console.log('Doctors result:', result);
      return result;
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewPatient = () => {
    setShowPatientModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleNewAppointment = () => {
    setShowAppointmentModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleDoctorClick = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowDoctorQueue(true);
  };

  const handleEditPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientEditModal(true);
    setError(null);
    setSuccess(null);
  };

  // Calculate stats
  const completedToday = todayAppointments?.filter((a: any) => a.appointmentStatus === 'COMPLETED').length || 0;

  return (
    <div className="min-h-screen bg-emerald-50/30">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-125 h-125 bg-emerald-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-100 h-100 bg-emerald-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">{HOSPITAL_INFO.name}</h1>
                <p className="text-xs sm:text-sm text-emerald-600 font-medium">Reception Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-6">
              {/* Current Time */}
              <div className="hidden md:flex items-center gap-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                  <p className="text-xs text-emerald-600">Receptionist</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-emerald-600 text-xs sm:text-sm font-medium">👋 Welcome back,</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900">{user?.username}</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Here's what's happening at the clinic today</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-50 p-3 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Total Patients</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{allPatients?.length || 0}</p>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-5 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Today</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Appointments</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{todayAppointments?.length || 0}</p>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-5 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-50 p-3 rounded-xl group-hover:bg-amber-100 transition-colors">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Pending</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {todayAppointments?.filter((a: any) => a.appointmentStatus === 'SCHEDULED' || a.appointmentStatus === 'CHECKED_IN').length || 0}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-5 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-50 p-3 rounded-xl group-hover:bg-green-100 transition-colors">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Done</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Completed</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{completedToday}</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div className="bg-emerald-100 p-1 rounded-full">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div className="bg-red-100 p-1 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <button
            onClick={handleNewPatient}
            className="bg-white rounded-2xl border-2 border-emerald-100 p-6 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-4 rounded-2xl group-hover:bg-emerald-200 transition-colors">
                  <UserPlus className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">New Patient</h3>
                  <p className="text-sm text-gray-500">Register a new patient</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={handleNewAppointment}
            className="bg-white rounded-2xl border-2 border-emerald-100 p-6 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-2xl group-hover:bg-blue-200 transition-colors">
                  <CalendarPlus className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">New Appointment</h3>
                  <p className="text-sm text-gray-500">Schedule an appointment</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Doctor Queue Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Doctor's Queue</h3>
                <p className="text-sm text-gray-500">Today's patient flow</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors && doctors.length > 0 ? (
              doctors.map((doctor: any) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  todayAppointments={todayAppointments || []}
                  onClick={() => handleDoctorClick(doctor)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-emerald-100">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No doctors available</p>
                <p className="text-sm text-gray-400 mt-1">Doctors will appear here once registered</p>
              </div>
            )}
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden mb-8">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Appointments</h3>
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('today')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'today'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'all'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'today' ? (
              <AppointmentsList
                appointments={(todayAppointments || []).map((apt: any) => ({
                  ...apt,
                  patient: allPatients?.find((p: any) => p.id === apt.patientId),
                  doctor: doctors?.find((d: any) => d.id === apt.doctorId),
                }))}
                emptyMessage="No appointments scheduled for today"
              />
            ) : (
              <AppointmentsList
                appointments={(allAppointments || []).map((apt: any) => ({
                  ...apt,
                  patient: allPatients?.find((p: any) => p.id === apt.patientId),
                  doctor: doctors?.find((d: any) => d.id === apt.doctorId),
                }))}
                emptyMessage="No appointments found"
              />
            )}
          </div>
        </div>

        {/* All Patients Record Section */}
        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">All Patients Record</h3>
                <p className="text-sm text-gray-500">View and edit patient information</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <PatientsRecordList
              patients={allPatients || []}
              onEdit={handleEditPatient}
            />
          </div>
        </div>

        {/* Modals */}
        {showPatientModal && (
          <PatientRegistrationModal
            onClose={() => setShowPatientModal(false)}
            onSuccess={(msg) => {
              setSuccess(msg);
              setShowPatientModal(false);
              queryClient.invalidateQueries({ queryKey: ['allPatients'] });
            }}
            onError={setError}
          />
        )}
        {showPatientEditModal && selectedPatient && (
          <PatientEditModal
            patient={selectedPatient}
            onClose={() => {
              setShowPatientEditModal(false);
              setSelectedPatient(null);
            }}
            onSuccess={(msg) => {
              setSuccess(msg);
              setShowPatientEditModal(false);
              setSelectedPatient(null);
              queryClient.invalidateQueries({ queryKey: ['allPatients'] });
            }}
            onError={setError}
          />
        )}
        {showAppointmentModal && (
          <AppointmentModal
            onClose={() => setShowAppointmentModal(false)}
            onSuccess={(msg) => {
              setSuccess(msg);
              setShowAppointmentModal(false);
              queryClient.invalidateQueries({ queryKey: ['todayAppointments', 'allAppointments'] });
            }}
            onError={setError}
          />
        )}
        {showDoctorQueue && selectedDoctor && (
          <DoctorQueueModal
            doctor={selectedDoctor}
            appointments={(todayAppointments || [])
              .filter((apt: any) => apt.doctorId === selectedDoctor.id)
              .map((apt: any) => ({
                ...apt,
                patient: allPatients?.find((p: any) => p.id === apt.patientId),
                doctor: selectedDoctor,
              }))}
            onClose={() => {
              setShowDoctorQueue(false);
              setSelectedDoctor(null);
            }}
          />
        )}
      </main>
    </div>
  );
};
