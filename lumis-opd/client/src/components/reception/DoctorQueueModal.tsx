import React from 'react';
import { X, Clock, Stethoscope, Phone, Hash, FileText, Calendar } from 'lucide-react';

interface DoctorQueueModalProps {
  doctor: any;
  appointments: any[];
  onClose: () => void;
}

export const DoctorQueueModal: React.FC<DoctorQueueModalProps> = ({ doctor, appointments, onClose }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (appointment: any) => {
    // Use opdVisit status if available, otherwise fall back to status
    const status = appointment.opdVisit?.visitStatus || appointment.status || appointment.appointmentStatus;
    
    switch (status) {
      case 'OPEN':
      case 'SCHEDULED':
      case 'CHECKED_IN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IN_PROGRESS':
      case 'IN_CONSULTATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (appointment: any) => {
    // Use opdVisit status if available, otherwise fall back to status
    const status = appointment.opdVisit?.visitStatus || appointment.status || appointment.appointmentStatus;
    
    switch (status) {
      case 'OPEN':
      case 'CHECKED_IN':
        return 'Waiting';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'IN_PROGRESS':
      case 'IN_CONSULTATION':
        return 'In Consultation';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status?.replace('_', ' ') || 'Unknown';
    }
  };

  // Sort appointments: waiting first, then in consultation, then completed
  const sortedAppointments = [...appointments].sort((a, b) => {
    // Use opdVisit status for sorting if available
    const getActualStatus = (apt: any) => apt.opdVisit?.visitStatus || apt.status || apt.appointmentStatus;
    
    const statusOrder: any = {
      'OPEN': 1,
      'CHECKED_IN': 2,
      'SCHEDULED': 3,
      'IN_PROGRESS': 4,
      'IN_CONSULTATION': 5,
      'COMPLETED': 6,
      'CANCELLED': 7,
      'NO_SHOW': 8,
    };
    return (statusOrder[getActualStatus(a)] || 99) - (statusOrder[getActualStatus(b)] || 99);
  });

  const stats = {
    waiting: sortedAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'OPEN' || status === 'SCHEDULED' || status === 'CHECKED_IN';
    }).length,
    inConsultation: sortedAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'IN_PROGRESS' || status === 'IN_CONSULTATION';
    }).length,
    completed: sortedAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'COMPLETED';
    }).length,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-50/50 border-b border-emerald-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-100 p-3 rounded-xl">
                <Stethoscope className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-sm text-emerald-600 font-medium mt-0.5">
                  {doctor.specialization || 'General Physician'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Stats Bar */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-100">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{stats.waiting} Waiting</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-100">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{stats.inConsultation} In Consult</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{stats.completed} Done</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {sortedAppointments.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-emerald-50 p-4 rounded-full w-fit mx-auto mb-4">
                <Calendar className="w-12 h-12 text-emerald-300" />
              </div>
              <p className="text-gray-500 font-medium">No appointments for today</p>
              <p className="text-sm text-gray-400 mt-1">The queue is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAppointments.map((appointment, index) => (
                <div 
                  key={appointment.id}
                  className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Queue Number */}
                      <div className="bg-emerald-50 text-emerald-700 font-bold text-lg w-10 h-10 rounded-xl flex items-center justify-center border-2 border-emerald-200">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-900">
                            {appointment.patient?.firstName || appointment.patientName || 'Unknown'} {appointment.patient?.lastName || ''}
                          </h4>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(appointment)}`}>
                            {getStatusLabel(appointment)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Hash className="w-3.5 h-3.5 text-gray-400" />
                            <span>{appointment.patient?.uhid || appointment.patientId || 'N/A'}</span>
                          </div>
                          {(appointment.patient?.mobile || appointment.patient?.phone) && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{appointment.patient?.mobile || appointment.patient?.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{appointment.appointmentTime || formatTime(appointment.appointmentDate)}</span>
                          </div>
                          {appointment.appointmentType && (
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                                appointment.appointmentType === 'NEW' ? 'bg-emerald-50 text-emerald-700' :
                                appointment.appointmentType === 'FOLLOW_UP' ? 'bg-blue-50 text-blue-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {appointment.appointmentType.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {appointment.notes && (
                          <div className="mt-3 flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                            <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-600">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-emerald-100 px-6 py-4 bg-emerald-50/30">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-emerald-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
