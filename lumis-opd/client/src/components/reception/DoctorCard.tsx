import React from 'react';
import { User, Clock, CheckCircle, Users, ChevronRight, Stethoscope } from 'lucide-react';

interface DoctorCardProps {
  doctor: any;
  todayAppointments: any[];
  onClick: () => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, todayAppointments, onClick }) => {
  console.log('DoctorCard - doctor:', doctor.id, doctor.firstName, doctor.lastName);
  console.log('DoctorCard - todayAppointments:', todayAppointments);
  console.log('DoctorCard - appointment doctorIds:', todayAppointments.map(a => a.doctorId));
  
  const doctorAppointments = todayAppointments.filter(apt => apt.doctorId === doctor.id);
  console.log('DoctorCard - filtered appointments for this doctor:', doctorAppointments.length);
  
  const stats = {
    total: doctorAppointments.length,
    waiting: doctorAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'SCHEDULED' || status === 'CHECKED_IN' || status === 'OPEN';
    }).length,
    inConsultation: doctorAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'IN_PROGRESS' || status === 'IN_CONSULTATION';
    }).length,
    completed: doctorAppointments.filter(a => {
      const status = a.opdVisit?.visitStatus || a.status || a.appointmentStatus;
      return status === 'COMPLETED';
    }).length,
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl border-2 border-emerald-100 p-5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="bg-emerald-100 p-3 rounded-xl group-hover:bg-emerald-200 transition-colors">
          <Stethoscope className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
            Dr. {doctor.firstName} {doctor.lastName}
          </h3>
          <p className="text-sm text-emerald-600 font-medium">{doctor.specialization || 'General Physician'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-medium text-gray-500">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-medium text-amber-600">Waiting</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.waiting}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-600">In Consult</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.inConsultation}</p>
        </div>

        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-medium text-emerald-600">Done</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
        </div>
      </div>

      <button className="w-full px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all text-sm font-semibold flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white">
        View Queue
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
