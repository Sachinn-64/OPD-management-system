import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { superAdminService } from '../../services/firebase/superAdminService';
import { clinicFirebaseService } from '../../services/firebase/clinicService';
import { logOut } from '../../lib/firebase/auth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SubscriptionManager } from '../../components/admin/SubscriptionManager';
import { Clinic } from '../../lib/firebase/types';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout: authLogout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'clinics' | 'analytics' | 'subscriptions'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [subscriptionModalClinic, setSubscriptionModalClinic] = useState<Clinic | null>(null);

  // Ensure only super admin can access
  React.useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch platform analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: () => superAdminService.getPlatformAnalytics(),
  });

  // Fetch all clinics
  const { data: allClinics = [], isLoading: clinicsLoading } = useQuery({
    queryKey: ['all-clinics'],
    queryFn: () => superAdminService.getAllClinics(),
  });

  // Fetch expiring trials
  const { data: expiringTrials = [] } = useQuery({
    queryKey: ['expiring-trials'],
    queryFn: () => superAdminService.getExpiringTrials(7),
  });

  // Deactivate expired clinics mutation
  const deactivateExpiredMutation = useMutation({
    mutationFn: () => superAdminService.deactivateExpiredClinics(),
    onSuccess: (deactivatedIds) => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      alert(`Deactivated ${deactivatedIds.length} expired clinics`);
    },
  });

  const handleLogout = async () => {
    await logOut();
    authLogout();
    navigate('/login');
  };

  const filteredClinics = searchTerm
    ? allClinics.filter(
        (clinic) =>
          clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clinic.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clinic.phone.includes(searchTerm)
      )
    : allClinics;

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Super Admin Panel</h1>
                <p className="text-sm text-purple-100">Lumis OPD Platform Management</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-white text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Alert for expiring trials */}
      {expiringTrials.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  <strong>{expiringTrials.length}</strong> trial{expiringTrials.length > 1 ? 's' : ''} expiring in the next 7 days
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('subscriptions')}
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('clinics')}
                className={`${
                  activeTab === 'clinics'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Building2 className="w-5 h-5 mr-2" />
                Clinics ({allClinics.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`${
                  activeTab === 'analytics'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Activity className="w-5 h-5 mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`${
                  activeTab === 'subscriptions'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Subscriptions
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Clinics</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.totalClinics || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analytics?.activeClinics || 0} active, {analytics?.trialClinics || 0} trial
                    </p>
                  </div>
                  <Building2 className="w-10 h-10 text-purple-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Doctors</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.totalDoctors || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Across all clinics</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Patients</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {analytics?.totalPatients?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Registered patients</p>
                  </div>
                  <Users className="w-10 h-10 text-green-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Annual Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      ₹{((analytics?.annualRevenue || 0) / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-gray-500 mt-1">₹{analytics?.monthlyRevenue?.toLocaleString() || 0}/month</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-emerald-600" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => deactivateExpiredMutation.mutate()}
                  disabled={deactivateExpiredMutation.isPending}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {deactivateExpiredMutation.isPending ? 'Processing...' : 'Deactivate Expired Clinics'}
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('clinics')}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Manage Clinics
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('subscriptions')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscriptions
                </Button>
              </div>
            </Card>

            {/* Recent Clinics */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Registered Clinics</h2>
              <div className="space-y-3">
                {allClinics.slice(0, 5).map((clinic) => (
                  <div key={clinic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{clinic.name}</p>
                        <p className="text-sm text-gray-500">{clinic.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          clinic.subscriptionStatus === 'active'
                            ? 'bg-green-100 text-green-800'
                            : clinic.subscriptionStatus === 'trial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {clinic.subscriptionStatus}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setSelectedClinic(clinic)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Clinics Tab */}
        {activeTab === 'clinics' && (
          <div className="space-y-6">
            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search clinics by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </Card>

            {/* Clinics Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clinic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClinics.map((clinic) => (
                      <tr key={clinic.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                            <div className="text-sm text-gray-500">{clinic.address}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{clinic.email}</div>
                          <div className="text-sm text-gray-500">{clinic.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              clinic.subscriptionStatus === 'active'
                                ? 'bg-green-100 text-green-800'
                                : clinic.subscriptionStatus === 'trial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {clinic.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(clinic.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button variant="outline" size="sm" onClick={() => setSelectedClinic(clinic)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Active Clinics</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analytics?.activeClinics || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                      <span className="text-gray-700">Trial Clinics</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analytics?.trialClinics || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 text-red-500 mr-2" />
                      <span className="text-gray-700">Inactive Clinics</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analytics?.inactiveClinics || 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Total Users</span>
                    <span className="font-semibold text-gray-900">{analytics?.totalUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Total Appointments</span>
                    <span className="font-semibold text-gray-900">
                      {analytics?.totalAppointments?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Avg Doctors/Clinic</span>
                    <span className="font-semibold text-gray-900">
                      {analytics && analytics.totalClinics > 0
                        ? Math.round(analytics.totalDoctors / analytics.totalClinics)
                        : 0}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expiring Trials (Next 7 Days)</h2>
              {expiringTrials.length === 0 ? (
                <p className="text-gray-500">No trials expiring soon</p>
              ) : (
                <div className="space-y-3">
                  {expiringTrials.map((clinic) => (
                    <div key={clinic.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div>
                        <p className="font-medium text-gray-900">{clinic.name}</p>
                        <p className="text-sm text-gray-600">{clinic.email}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            Expires: {clinic.subscriptionEndDate ? new Date(clinic.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {clinic.subscriptionEndDate
                              ? Math.ceil((new Date(clinic.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                              : 0}{' '}
                            days remaining
                          </p>
                        </div>
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => setSubscriptionModalClinic(clinic)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Clinic Details Modal */}
      {selectedClinic && (
        <ClinicDetailsModal 
          clinic={selectedClinic} 
          onClose={() => setSelectedClinic(null)}
          onManageSubscription={() => {
            setSubscriptionModalClinic(selectedClinic);
            setSelectedClinic(null);
          }}
        />
      )}

      {/* Subscription Management Modal */}
      {subscriptionModalClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Manage Subscription</h2>
                <p className="text-gray-500">{subscriptionModalClinic.name}</p>
              </div>
              <button 
                onClick={() => setSubscriptionModalClinic(null)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <SubscriptionManager 
              clinic={subscriptionModalClinic} 
              onClose={() => setSubscriptionModalClinic(null)} 
            />
          </Card>
        </div>
      )}
    </div>
  );
};

// Clinic Details Modal Component
const ClinicDetailsModal: React.FC<{ 
  clinic: Clinic; 
  onClose: () => void;
  onManageSubscription: () => void;
}> = ({ clinic, onClose, onManageSubscription }) => {
  const { data: stats } = useQuery({
    queryKey: ['clinic-stats', clinic.id],
    queryFn: () => superAdminService.getClinicStats(clinic.id!),
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{clinic.name}</h2>
            <p className="text-gray-500">{clinic.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{clinic.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    clinic.subscriptionStatus === 'active'
                      ? 'bg-green-100 text-green-800'
                      : clinic.subscriptionStatus === 'trial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {clinic.subscriptionStatus}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-gray-900">{clinic.address}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                  <p className="text-xs text-gray-600">Users</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.totalDoctors}</p>
                  <p className="text-xs text-gray-600">Doctors</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats.totalPatients}</p>
                  <p className="text-xs text-gray-600">Patients</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{stats.totalAppointments}</p>
                  <p className="text-xs text-gray-600">Appointments</p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Info */}
          {clinic.subscriptionEndDate && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Subscription</h3>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">
                  Expires on: {new Date(clinic.subscriptionEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button variant="primary" className="flex-1" onClick={onManageSubscription}>
              Manage Subscription
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
