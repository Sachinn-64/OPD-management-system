import React, { useState } from 'react';
import { IndianRupee, Calendar } from 'lucide-react';
import { PaymentDetailsModal } from './PaymentDetailsModal';

interface AppointmentsListProps {
  appointments: any[];
  emptyMessage: string;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({ appointments, emptyMessage }) => {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CHECKED_IN':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'IN_CONSULTATION':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NEW':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'FOLLOW_UP':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'REFERRAL':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-emerald-50 p-4 rounded-full w-fit mx-auto mb-4">
          <Calendar className="w-12 h-12 text-emerald-300" />
        </div>
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {selectedAppointment && (
        <PaymentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
      <div className="overflow-x-auto rounded-xl border-2 border-emerald-100">
      <table className="w-full">
        <thead className="bg-emerald-50/50 border-b-2 border-emerald-100">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Date</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">UHID</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Doctor</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Type</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Status</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Charges</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment</th>
            <th className="px-4 py-4 text-left text-xs font-bold text-emerald-700 uppercase tracking-wider">Notes</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-emerald-50">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="hover:bg-emerald-50/30 transition-colors">
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {formatDate(appointment.appointmentDate)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                {appointment.patient?.firstName} {appointment.patient?.lastName}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                {appointment.patient?.uhid || 'N/A'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-700 font-medium">
                Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(appointment.appointmentType)}`}>
                  {appointment.appointmentType?.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.appointmentStatus)}`}>
                  {appointment.appointmentStatus}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                ₹ {appointment.consultationCharges?.toFixed(2) || '0.00'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <button
                  onClick={() => setSelectedAppointment(appointment)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-200"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  View
                </button>
              </td>
              <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                {appointment.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
};
