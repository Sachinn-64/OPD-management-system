import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Activity, Thermometer, Wind, Droplets, Weight, Ruler, FlaskRound, Clock } from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';
import { consultationService, Vitals } from '../../services/consultationService';

export const VitalsDisplay: React.FC = () => {
  const { selectedAppointment } = useConsultationStore();

  // Fetch vitals for this appointment's opdVisit
  const { data: vitalsData, isLoading } = useQuery<Vitals[]>({
    queryKey: ['appointmentVitals', selectedAppointment?.opdVisit?.id],
    queryFn: () => consultationService.getVitalsByVisit(selectedAppointment!.opdVisit!.id),
    enabled: !!selectedAppointment?.opdVisit?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!vitalsData || vitalsData.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No vitals recorded yet</p>
        <p className="text-sm text-gray-500 mt-1">Nurse needs to record vitals for this patient</p>
      </div>
    );
  }

  // Get the latest vitals record
  const latestVitals = vitalsData[0] as any;



  // Helper to find vital value and unit
  const getVital = (name: string) => {
    const detail = latestVitals.details?.find((d: any) => d.vitalName === name);
    return detail ? { value: detail.vitalValue, unit: detail.vitalUnit || '' } : null;
  };

  // Calculate if vital is in normal range


  // Get BP - check for systolic/diastolic direct fields or parse from combined value
  const getBPVital = () => {
    // First try direct fields (from newer nurse form or VitalsForm)
    if (latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic) {
      return { value: `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}`, unit: 'mmHg' };
    }

    // Fallback to details array
    const bpDetail = getVital('Blood Pressure');
    if (bpDetail) {
      const bpValue = String(bpDetail.value);
      // Check if it's already in "systolic/diastolic" format
      if (bpValue.includes('/')) {
        return bpDetail;
      }
      // If it's just systolic (old data), show it as is
      return { value: bpValue, unit: bpDetail.unit };
    }
    return null;
  };

  const vitalCards = [
    { name: 'Blood Pressure', icon: Activity, vital: getBPVital() },
    { name: 'Heart Rate', icon: Heart, vital: latestVitals.heartRate ? { value: latestVitals.heartRate, unit: 'bpm' } : getVital('Heart Rate') },
    { name: 'Temperature', icon: Thermometer, vital: latestVitals.temperature ? { value: latestVitals.temperature, unit: '°F' } : getVital('Temperature') },
    { name: 'Respiratory Rate', icon: Wind, vital: latestVitals.respiratoryRate ? { value: latestVitals.respiratoryRate, unit: '/min' } : getVital('Respiratory Rate') },
    { name: 'Oxygen Saturation', icon: Droplets, vital: latestVitals.oxygenSaturation ? { value: latestVitals.oxygenSaturation, unit: '%' } : getVital('Oxygen Saturation') },
  ];

  const measurementCards = [
    { name: 'Weight', icon: Weight, vital: getVital('Weight') },
    { name: 'Height', icon: Ruler, vital: getVital('Height') },
    { name: 'Serum Creatinine', icon: FlaskRound, vital: getVital('Serum Creatinine') },
  ];

  const calculatedCards = [
    { name: 'BMI', vital: getVital('BMI') },
    { name: 'BSA', vital: getVital('BSA') },
    { name: 'eGFR', vital: getVital('eGFR') },
  ];

  return (
    <div className="space-y-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">
            {new Date(latestVitals.recordedAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
        <span className="text-xs font-semibold text-emerald-600">Recorded</span>
      </div>

      {/* Vital Signs */}
      <div className="space-y-2">
        {vitalCards.map((vital, index) => {
          if (!vital.vital) return null;

          return (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <vital.icon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-700">{vital.name}</span>
              </div>

              <span className="text-base font-bold text-emerald-600">
                {vital.vital.value} <span className="text-sm font-normal">{vital.vital.unit}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Measurements */}
      <div className="space-y-2 pt-2">
        {measurementCards.map((vital, index) => {
          if (!vital.vital) return null;

          return (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <vital.icon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-700">{vital.name}</span>
              </div>

              <span className="text-base font-bold text-emerald-600">
                {vital.vital.value} <span className="text-sm font-normal">{vital.vital.unit}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Calculated Values */}
      <div className="space-y-2 pt-2">
        {calculatedCards.map((calc, index) => {
          if (!calc.vital) return null;

          return (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200"
            >
              <span className="text-sm text-gray-700">{calc.name}</span>
              <span className="text-base font-bold text-emerald-600">
                {calc.vital.value} <span className="text-sm font-normal">{calc.vital.unit}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
