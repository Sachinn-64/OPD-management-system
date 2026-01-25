import React, { useState, useMemo } from 'react';
import { User, Search, X } from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';

export const PatientQueue: React.FC = () => {
  const { todayQueue, selectedQueueIndex, selectQueuePatient } = useConsultationStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter by search
  const filteredQueue = useMemo(() => {
    if (!todayQueue) return [];
    if (!searchQuery.trim()) return todayQueue;

    const query = searchQuery.toLowerCase();
    return todayQueue.filter(a => {
      const patientName = a.patient
        ? `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase()
        : '';
      const uhid = a.patient?.uhid?.toLowerCase() || '';
      return patientName.includes(query) || uhid.includes(query);
    });
  }, [todayQueue, searchQuery]);

  // Separate pending and completed
  const pendingQueue = useMemo(() => {
    return filteredQueue.filter(a => a.opdVisit?.visitStatus !== 'COMPLETED');
  }, [filteredQueue]);

  const completedQueue = useMemo(() => {
    return filteredQueue.filter(a => a.opdVisit?.visitStatus === 'COMPLETED');
  }, [filteredQueue]);

  // const formatTime = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  // };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!todayQueue || todayQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <User className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No patients in queue</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending Queue */}
        <div>
          {pendingQueue.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm">No pending patients</p>
            </div>
          ) : (
            pendingQueue.map((appointment, _index) => {
              const actualIndex = todayQueue.findIndex(a => a.id === appointment.id);
              const isSelected = selectedQueueIndex === actualIndex;
              const patient = appointment.patient;

              return (
                <div
                  key={appointment.id}
                  onClick={() => selectQueuePatient(actualIndex)}
                  className={`p-4 border-b cursor-pointer transition-all ${isSelected
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                    : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Queue Number */}
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                    >
                      {appointment.queueNumber || (actualIndex + 1)}
                    </div>

                    {/* Patient Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-gray-900 truncate">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-600">
                        <span className="text-emerald-700 font-medium">{patient?.uhid || `#${(appointment.id || '').slice(0, 8)}`}</span>
                        {patient?.dateOfBirth && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{calculateAge(patient.dateOfBirth)}y</span>
                          </>
                        )}
                        {patient?.gender && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="capitalize">{patient.gender.toLowerCase()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Completed Queue */}
        {completedQueue.length > 0 && (
          <div className="mt-6">
            <div className="sticky top-0 bg-white px-4 py-2 border-b-2 border-emerald-600">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Completed ({completedQueue.length})
              </h3>
            </div>
            {completedQueue.map((appointment, _index) => {
              const actualIndex = todayQueue.findIndex(a => a.id === appointment.id);
              const isSelected = selectedQueueIndex === actualIndex;
              const patient = appointment.patient;

              return (
                <div
                  key={appointment.id}
                  onClick={() => selectQueuePatient(actualIndex)}
                  className={`p-4 border-b cursor-pointer transition-all ${isSelected
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                    : 'bg-gray-50 hover:bg-gray-100 border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Queue Number */}
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base shrink-0 bg-gray-200 text-gray-600">
                      {appointment.queueNumber || (actualIndex + 1)}
                    </div>

                    {/* Patient Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-gray-700 truncate">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                        <span className="text-emerald-700 font-medium">{patient?.uhid || `#${(appointment.id || '').slice(0, 8)}`}</span>
                        {patient?.dateOfBirth && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{calculateAge(patient.dateOfBirth)}y</span>
                          </>
                        )}
                        {patient?.gender && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="capitalize">{patient.gender.toLowerCase()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Completed Checkmark */}
                    <div className="shrink-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
