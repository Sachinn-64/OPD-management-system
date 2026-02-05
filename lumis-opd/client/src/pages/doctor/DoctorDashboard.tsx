import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Clock,
  Activity,
  Bell,
  LogOut,
  UserCircle,
  Stethoscope,
  History,
  CheckCircle2,
  X,
  RefreshCw,
  Edit3,
  Save,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useConsultationStore } from '../../store/consultationStore';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import { useSocket } from '../../hooks/useSocket';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PatientQueue } from '../../components/doctor/PatientQueue';
import { ConsultationPanel } from '../../components/doctor/ConsultationPanel';
import { PatientHistory } from '../../components/doctor/PatientHistory';
import { HOSPITAL_INFO } from '../../config/constants';

export const DoctorDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { currentVisit, setTodayQueue, selectQueuePatient } = useConsultationStore();
  const { isConnected, onNotification } = useSocket();
  const [activeView, setActiveView] = useState<'consultation' | 'history'>('consultation');

  // Profile edit modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editSpecialty, setEditSpecialty] = useState('');

  // Fetch doctor profile first to get doctorId
  const { data: doctorProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['doctorProfile', user?.id],
    queryFn: async () => {
      console.log('Fetching doctor profile for user:', user?.id);
      const result = await doctorService.getByUserId(user?.id || '');
      console.log('Doctor profile result:', result);
      return result;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch today's queue using doctorId from profile
  const { data: queueData, refetch: refetchQueue, isLoading: isLoadingQueue, error: queueError, isFetching: isRefetching } = useQuery({
    queryKey: ['todayQueue', doctorProfile?.id],
    queryFn: async () => {
      console.log('Fetching queue for doctor:', doctorProfile?.id);
      const result = await appointmentService.getTodayQueue(doctorProfile?.id || '');
      console.log('Queue result:', result);
      return result;
    },
    enabled: !!doctorProfile?.id,
    staleTime: 30000, // Data considered fresh for 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refresh when user comes back to tab
    refetchInterval: false, // Disabled - use manual refresh to save Firebase reads
  });

  // Debug logging
  useEffect(() => {
    console.log('=== Doctor Dashboard Debug ===');
    console.log('User:', user);
    console.log('Doctor Profile:', doctorProfile);
    console.log('Profile Loading:', isLoadingProfile);
    console.log('Profile Error:', profileError);
    console.log('Queue Data:', queueData);
    console.log('Queue Loading:', isLoadingQueue);
    console.log('Queue Error:', queueError);
    console.log('Current Visit:', currentVisit);
  }, [user, doctorProfile, isLoadingProfile, profileError, queueData, isLoadingQueue, queueError, currentVisit]);

  // Set queue data and update currentVisit with fresh data
  useEffect(() => {
    if (queueData) {
      setTodayQueue(queueData);

      // If there's a currently selected visit, update it with fresh data from the queue
      if (currentVisit?.id) {
        const freshVisit = queueData.find(a => a.id === currentVisit.id);
        if (freshVisit && freshVisit.opdVisit) {
          // Only update if the opdVisit data has changed (e.g., status or embedded data)
          const currentStatus = currentVisit.opdVisit?.visitStatus;
          const freshStatus = freshVisit.opdVisit?.visitStatus;
          if (currentStatus !== freshStatus || freshStatus === 'COMPLETED') {
            selectQueuePatient(queueData.findIndex(a => a.id === currentVisit.id));
          }
        }
      } else if (queueData.length > 0) {
        // Auto-select first non-completed patient if none selected
        const firstPendingIndex = queueData.findIndex(
          (appointment) => appointment.opdVisit?.visitStatus !== 'COMPLETED'
        );
        selectQueuePatient(firstPendingIndex >= 0 ? firstPendingIndex : 0);
      }
    }
  }, [queueData, setTodayQueue, currentVisit?.id, selectQueuePatient]);

  // Listen for socket notifications
  const [notificationBanner, setNotificationBanner] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onNotification?.((notification) => {
      if (notification.type === 'NEW_APPOINTMENT' || notification.type === 'APPOINTMENT_UPDATE') {
        refetchQueue();
      }

      // Show notification banner for investigation completed
      if (notification.type === 'investigation_completed') {
        setNotificationBanner(notification);
        // Auto-hide after 10 seconds
        setTimeout(() => setNotificationBanner(null), 10000);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [onNotification, refetchQueue]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = [
    {
      label: 'Total Patients',
      value: queueData?.length || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'Waiting',
      value: queueData?.filter((a) => a.opdVisit?.visitStatus === 'OPEN').length || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      label: 'In Consultation',
      value: queueData?.filter((a) => a.opdVisit?.visitStatus === 'IN_PROGRESS').length || 0,
      icon: Activity,
      color: 'bg-emerald-500',
    },
    {
      label: 'Completed',
      value: queueData?.filter((a) => a.opdVisit?.visitStatus === 'COMPLETED').length || 0,
      icon: Calendar,
      color: 'bg-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-emerald-50/30">
      {/* Investigation Completed Notification Banner */}
      {notificationBanner && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-green-600 text-white rounded-lg shadow-2xl p-3 sm:p-4 max-w-sm sm:max-w-md animate-slide-in-right">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">{notificationBanner.title}</h4>
                <p className="text-sm text-green-100">{notificationBanner.message}</p>
                {notificationBanner.data?.completedTests && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {notificationBanner.data.completedTests.map((test: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded">
                        {test}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Hospital Info */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-emerald-600 p-1.5 sm:p-2 rounded-lg">
                <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-xl font-bold text-gray-900">
                  {HOSPITAL_INFO.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">{HOSPITAL_INFO.tagline}</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{isConnected ? 'Live' : 'Offline'}</span>
              </div>

              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button
                onClick={() => {
                  setEditSpecialty(doctorProfile?.specialty || '');
                  setShowProfileModal(true);
                }}
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <UserCircle className="w-8 h-8 text-gray-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    Dr. {user?.username}
                  </p>
                  <p className="text-xs text-gray-600">
                    {doctorProfile?.specialty || 'Click to set specialty'}
                  </p>
                </div>
                <Edit3 className="w-4 h-4 text-gray-400" />
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Date & Stats Bar */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
              <div className="hidden sm:flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span className="font-medium whitespace-nowrap">{today}</span>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('consultation')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'consultation'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Consultation
                </button>
                <button
                  onClick={() => setActiveView('history')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'history'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <History className="w-4 h-4 inline mr-2" />
                  All Patients
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto pb-2 sm:pb-0">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 whitespace-nowrap">{stat.label}</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-3 sm:p-6">
        {activeView === 'consultation' ? (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Patient Queue - Collapsible on mobile */}
            <div className="lg:col-span-3 order-1">
              <Card
                title="Today's Queue"
                noPadding
                className="max-h-[40vh] lg:max-h-none lg:h-[calc(100vh-280px)] overflow-auto"
                actions={
                  <button
                    onClick={() => refetchQueue()}
                    disabled={isRefetching}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh queue"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  </button>
                }
              >
                <PatientQueue />
              </Card>
            </div>

            {/* Consultation Panel - Main Area */}
            <div className="lg:col-span-9 order-2">
              {currentVisit ? (
                <ConsultationPanel />
              ) : (
                <Card className="h-64 lg:h-[calc(100vh-280px)] flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No Patient Selected
                    </h3>
                    <p className="text-gray-500">
                      Select a patient from the queue to start consultation
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card title="Patient History" className="h-[calc(100vh-280px)]" noPadding>
            <PatientHistory />
          </Card>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <UserCircle className="w-8 h-8 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                  <p className="text-sm text-gray-600">Dr. {user?.username}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialty / Degrees
                </label>
                <input
                  type="text"
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  placeholder="e.g., Cardiologist, MD, MBBS"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter your specialty and/or degrees. This will be displayed on prescriptions.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!user?.id || !editSpecialty.trim()) return;
                  try {
                    await doctorService.update(user.id, { specialty: editSpecialty.trim() });
                    // Refetch doctor profile to update the UI
                    queryClient.invalidateQueries({ queryKey: ['doctorProfile', user.id] });
                    setShowProfileModal(false);
                  } catch (error) {
                    console.error('Failed to update specialty:', error);
                    alert('Failed to update specialty. Please try again.');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
