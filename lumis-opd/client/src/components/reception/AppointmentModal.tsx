import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Calendar, Stethoscope, CreditCard, FileText, User, CheckCircle, Plus } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import { doctorService, createTestDoctor } from '../../services/doctorService';
import { AppointmentReceipt } from './AppointmentReceipt';

interface AppointmentModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ onClose, onSuccess, onError }) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [formData, setFormData] = useState({
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentType: 'NEW' as 'NEW' | 'FOLLOW_UP' | 'REFERRAL',
    consultationCharges: '',
    notes: '',
  });
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ['searchPatients', searchQuery],
    queryFn: () => patientService.search(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const { data: doctors, isLoading: doctorsLoading, refetch: refetchDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      console.log('Fetching doctors...');
      const result = await doctorService.getAll();
      console.log('Doctors fetched:', result);
      return result;
    },
  });

  // Create test doctor mutation
  const handleCreateTestDoctor = async () => {
    setIsCreatingDoctor(true);
    try {
      await createTestDoctor();
      await refetchDoctors();
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    } catch (err) {
      console.error('Error creating test doctor:', err);
      onError('Failed to create test doctor');
    } finally {
      setIsCreatingDoctor(false);
    }
  };

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => appointmentService.create(data),
    onSuccess: (data) => {
      setCreatedAppointment(data);
      setShowReceipt(true);
      onSuccess('Appointment scheduled successfully!');
    },
    onError: (err: any) => {
      onError(err.response?.data?.message || 'Failed to schedule appointment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor) {
      onError('Please select patient and doctor');
      return;
    }

    createAppointmentMutation.mutate({
      patientId: selectedPatient.id,
      doctorId: selectedDoctor,
      appointmentDate: formData.appointmentDate,
      consultationCharges: parseFloat(formData.consultationCharges) || 0,
      appointmentType: formData.appointmentType,
      notes: formData.notes,
    });
  };

  return (
    <>
      {showReceipt && createdAppointment && selectedPatient && selectedDoctor ? (
        <AppointmentReceipt
          appointment={createdAppointment}
          patient={selectedPatient}
          doctor={doctors?.find((d: any) => d.id === selectedDoctor)}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
            <div className="bg-white border-b border-emerald-100 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-emerald-100 p-2 sm:p-2.5 rounded-xl">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Schedule Appointment</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Book a new appointment</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(95vh-140px)]">
              {/* Patient Search */}
              <div className="bg-emerald-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-emerald-600" />
                  <label className="text-sm font-bold text-emerald-800">
                    Search Patient <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, UHID, or phone..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                {selectedPatient && (
                  <div className="mt-3 p-4 bg-white rounded-xl border-2 border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-sm text-emerald-600 font-medium">UHID: {selectedPatient.uhid}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {!selectedPatient && patients && patients.length > 0 && (
                  <div className="mt-3 bg-white border border-gray-200 rounded-xl max-h-40 overflow-y-auto shadow-lg">
                    {patients.map((patient: any) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => { setSelectedPatient(patient); setSearchQuery(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b last:border-b-0 transition-colors"
                      >
                        <p className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</p>
                        <p className="text-sm text-gray-500">UHID: {patient.uhid} • Phone: {patient.mobile || 'N/A'}</p>
                      </button>
                    ))}
                  </div>
                )}
                {!selectedPatient && searchQuery.length >= 2 && patients && patients.length === 0 && (
                  <div className="mt-3 p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No patients found. Try a different search term.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="bg-blue-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-bold text-blue-800">
                      Doctor <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {doctorsLoading ? (
                    <div className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-500">
                      Loading doctors...
                    </div>
                  ) : doctors && doctors.length > 0 ? (
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((doc: any) => (
                        <option key={doc.id} value={doc.id}>Dr. {doc.firstName} {doc.lastName}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">No doctors found. Please add doctors from Admin Panel.</p>
                      <button
                        type="button"
                        onClick={handleCreateTestDoctor}
                        disabled={isCreatingDoctor}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        {isCreatingDoctor ? 'Creating...' : 'Add Test Doctor'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <label className="text-sm font-bold text-purple-800">
                      Appointment Type <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <select
                    value={formData.appointmentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointmentType: e.target.value as any }))}
                    required
                    className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  >
                    <option value="NEW">New Patient</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>

                <div className="bg-amber-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <label className="text-sm font-bold text-amber-800">
                      Date <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div className="bg-emerald-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <label className="text-sm font-bold text-emerald-800">
                      Charges (₹) <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    value={formData.consultationCharges}
                    onChange={(e) => setFormData(prev => ({ ...prev, consultationCharges: e.target.value }))}
                    required
                    min="0"
                    step="50"
                    placeholder="500"
                    className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or reason for visit..."
                    rows={3}
                    className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAppointmentMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scheduling...
                    </span>
                  ) : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
