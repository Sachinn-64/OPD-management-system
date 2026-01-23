import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Activity, LogOut } from 'lucide-react';
import { HOSPITAL_INFO } from '../../config/constants';

export const GeneralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Redirect users to their role-specific dashboards
  React.useEffect(() => {
    if (user?.roles.includes('casualty')) {
      navigate('/nurse/dashboard', { replace: true });
    } else if (user?.roles.some(role => role.toLowerCase() === 'pathology staff' || role.toLowerCase() === 'pathologist')) {
      navigate('/pathologist/dashboard', { replace: true });
    } else if (user?.roles.some(role => role.toLowerCase() === 'radiology staff' || role.toLowerCase() === 'radiologist')) {
      navigate('/radiologist/dashboard', { replace: true });
    } else if (user?.roles.includes('doctor')) {
      navigate('/doctor/dashboard', { replace: true });
    } else if (user?.roles.includes('receptionist')) {
      navigate('/reception/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = () => {
    if (user?.roles.includes('pathology staff')) return 'Pathology Staff';
    if (user?.roles.includes('radiology staff')) return 'Radiology Staff';
    if (user?.roles.includes('casualty')) return 'Casualty';
    if (user?.roles.includes('admin')) return 'Admin';
    return 'Staff';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{HOSPITAL_INFO.name}</h1>
                <p className="text-sm text-gray-500">{getRoleLabel()} Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{getRoleLabel()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user?.username}!</h2>
          <p className="text-gray-600">You have successfully logged in as {getRoleLabel()}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Activity className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{getRoleLabel()} Dashboard</h3>
            <p className="text-gray-600 mb-6">Your role-specific features are being developed.</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-blue-800">
                This dashboard will include specialized tools and features for {getRoleLabel().toLowerCase()}.
                The full implementation is in progress.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
