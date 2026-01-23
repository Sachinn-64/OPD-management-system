import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  UserPlus,
  Settings,
  CreditCard,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logOut } from '../../lib/firebase/auth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLLECTIONS, User } from '../../lib/firebase/types';
import { signUp } from '../../lib/firebase/auth';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clinic, logout: authLogout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Ensure only admin can access
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch clinic users
  const { data: users = [], isLoading: _usersLoading } = useQuery({
    queryKey: ['clinic-users', user?.clinicId],
    queryFn: async () => {
      if (!user?.clinicId) return [];
      const usersRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    },
    enabled: !!user?.clinicId,
  });

  const handleLogout = async () => {
    await logOut();
    authLogout();
    navigate('/login');
  };

  if (!user || !clinic) {
    return <div>Loading...</div>;
  }

  const isTrialEnding = clinic.subscriptionStatus === 'trial' && clinic.subscriptionEndDate;
  const daysRemaining = isTrialEnding && clinic.subscriptionEndDate
    ? Math.ceil((new Date(clinic.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{clinic.name}</h1>
                <p className="text-sm text-gray-500">Admin Panel</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Trial Warning */}
      {isTrialEnding && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                Your trial expires in <strong>{daysRemaining} days</strong>. Contact support to upgrade your subscription.
              </p>
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
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Building2 className="w-5 h-5 mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Users className="w-5 h-5 mr-2" />
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-emerald-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Subscription</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1 capitalize">
                      {clinic.subscriptionStatus}
                    </p>
                  </div>
                  <CreditCard className="w-10 h-10 text-blue-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Doctors</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {users.filter(u => u.role === 'doctor' && u.isActive).length}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
              </Card>
            </div>

            {/* Clinic Info */}
            <Card className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Clinic Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{clinic.email}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-gray-900">{clinic.phone}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-gray-900">{clinic.address}</p>
                  </div>
                </div>
                {clinic.subscriptionEndDate && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Subscription End Date</p>
                      <p className="text-gray-900">
                        {new Date(clinic.subscriptionEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Manage Users</h2>
              <Button variant="primary" onClick={() => setShowAddUserModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{u.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.isActive ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-gray-600 hover:text-gray-900 mr-3">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.id !== user.uid && (
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Settings</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="text-lg font-medium text-gray-900 capitalize">
                    {clinic.subscriptionStatus}
                  </p>
                </div>
                {clinic.subscriptionEndDate && (
                  <div>
                    <p className="text-sm text-gray-600">Valid Until</p>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(clinic.subscriptionEndDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <Button variant="primary">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade Subscription
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h2>
              <p className="text-sm text-gray-600 mb-4">
                Deactivating your clinic will prevent all users from accessing the system.
              </p>
              <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                Deactivate Clinic
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          clinicId={user.clinicId}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['clinic-users'] });
            setShowAddUserModal(false);
          }}
        />
      )}
    </div>
  );
};

// Add User Modal Component
const AddUserModal: React.FC<{
  clinicId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ clinicId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'receptionist' as 'admin' | 'doctor' | 'receptionist',
    // Doctor specific fields
    firstName: '',
    lastName: '',
    specialty: '',
    registrationNumber: '',
    qualification: '',
    consultationFee: 500,
  });
  const [error, setError] = useState<string>('');

  const addUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // If role is doctor, pass doctor details
      const doctorDetails = data.role === 'doctor' ? {
        firstName: data.firstName,
        lastName: data.lastName,
        specialty: data.specialty,
        registrationNumber: data.registrationNumber,
        qualification: data.qualification,
        consultationFee: data.consultationFee,
      } : undefined;
      
      return await signUp(data.email, data.password, clinicId, data.role, data.username, doctorDetails);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to add user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    addUserMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New User</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Doctor-specific fields */}
          {formData.role === 'doctor' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., General Medicine, Pediatrics"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Medical registration number"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., MBBS, MD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                  <input
                    type="number"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={0}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={addUserMutation.isPending}
              className="flex-1"
            >
              {addUserMutation.isPending ? 'Adding...' : 'Add User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
