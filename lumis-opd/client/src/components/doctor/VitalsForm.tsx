import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, History } from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';
import { consultationService } from '../../services/consultationService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { VITAL_SIGNS } from '../../config/constants';

type Props = {
  onSuccess?: () => void;
};

export const VitalsForm: React.FC<Props> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const { currentVisit, currentPatient, setVitals } = useConsultationStore();

  const [formData, setFormData] = useState({
    temperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    serumCreatinine: '',
    notes: '',
  });

  // Fetch existing vitals
  const { data: existingVitalsArray } = useQuery({
    queryKey: ['vitals', currentVisit?.opdVisit?.id],
    queryFn: () => consultationService.getVitalsByVisit(currentVisit!.opdVisit!.id!),
    enabled: !!currentVisit?.opdVisit?.id,
  });

  const existingVitals = existingVitalsArray?.[0];

  // Fetch patient's vital history
  const { data: vitalHistory } = useQuery({
    queryKey: ['vitalHistory', currentPatient?.id],
    queryFn: () => consultationService.getVitalsByPatient(currentPatient!.id!, { limit: 5 }),
    enabled: !!currentPatient?.id,
  });

  // Load existing vitals
  useEffect(() => {
    if (existingVitals) {
      setFormData({
        temperature: existingVitals.temperature?.toString() || '',
        bloodPressureSystolic: existingVitals.bloodPressureSystolic?.toString() || '',
        bloodPressureDiastolic: existingVitals.bloodPressureDiastolic?.toString() || '',
        heartRate: existingVitals.heartRate?.toString() || '',
        respiratoryRate: existingVitals.respiratoryRate?.toString() || '',
        oxygenSaturation: existingVitals.oxygenSaturation?.toString() || '',
        weight: existingVitals.weight?.toString() || '',
        height: existingVitals.height?.toString() || '',
        serumCreatinine: String(existingVitals.details?.find(d => d.vitalName === 'Serum Creatinine')?.vitalValue || ''),
        notes: existingVitals.notes || '',
      });
      setVitals(existingVitals);
    }
  }, [existingVitals, setVitals]);

  // Save vitals mutation
  const saveMutation = useMutation({
    mutationFn: consultationService.createVitals,
    onSuccess: (data) => {
      setVitals(data);
      // Invalidate queries to refresh data in other components
      queryClient.invalidateQueries({ queryKey: ['vitals', currentVisit?.opdVisit?.id] });
      queryClient.invalidateQueries({ queryKey: ['vitalHistory', currentPatient?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointmentVitals', currentVisit?.opdVisit?.id] });
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentVisit?.opdVisit?.id || !currentPatient) return;

    const calculatedBMI = calculateBMI();
    const calculatedBSA = calculateBSA();
    const calculatedeGFR = calculateeGFR();

    // Build details array for all vitals
    const details: any[] = [];
    
    if (formData.temperature) {
      details.push({ vitalName: 'Temperature', vitalValue: parseFloat(formData.temperature), vitalUnit: '°F' });
    }
    if (formData.bloodPressureSystolic && formData.bloodPressureDiastolic) {
      details.push({ vitalName: 'Blood Pressure', vitalValue: `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`, vitalUnit: 'mmHg' });
      details.push({ vitalName: 'BP Systolic', vitalValue: parseInt(formData.bloodPressureSystolic), vitalUnit: 'mmHg' });
      details.push({ vitalName: 'BP Diastolic', vitalValue: parseInt(formData.bloodPressureDiastolic), vitalUnit: 'mmHg' });
    }
    if (formData.heartRate) {
      details.push({ vitalName: 'Heart Rate', vitalValue: parseInt(formData.heartRate), vitalUnit: 'bpm' });
    }
    if (formData.respiratoryRate) {
      details.push({ vitalName: 'Respiratory Rate', vitalValue: parseInt(formData.respiratoryRate), vitalUnit: '/min' });
    }
    if (formData.oxygenSaturation) {
      details.push({ vitalName: 'Oxygen Saturation', vitalValue: parseFloat(formData.oxygenSaturation), vitalUnit: '%' });
    }
    if (formData.weight) {
      details.push({ vitalName: 'Weight', vitalValue: parseFloat(formData.weight), vitalUnit: 'kg' });
    }
    if (formData.height) {
      details.push({ vitalName: 'Height', vitalValue: parseFloat(formData.height), vitalUnit: 'cm' });
    }
    if (calculatedBMI !== '-') {
      details.push({ vitalName: 'BMI', vitalValue: parseFloat(calculatedBMI), vitalUnit: 'kg/m²' });
    }
    if (calculatedBSA !== '-') {
      details.push({ vitalName: 'BSA', vitalValue: parseFloat(calculatedBSA), vitalUnit: 'm²' });
    }
    if (formData.serumCreatinine) {
      details.push({ vitalName: 'Serum Creatinine', vitalValue: parseFloat(formData.serumCreatinine), vitalUnit: 'mg/dL' });
    }
    if (calculatedeGFR !== '-') {
      details.push({ vitalName: 'eGFR', vitalValue: parseFloat(calculatedeGFR), vitalUnit: 'mL/min/1.73m²' });
    }

    const vitalData = {
      patientId: currentPatient.id,
      visitId: currentVisit.opdVisit.id,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : undefined,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
      pulseRate: formData.heartRate ? parseInt(formData.heartRate) : undefined, // Alias for heartRate
      respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : undefined,
      oxygenSaturation: formData.oxygenSaturation ? parseFloat(formData.oxygenSaturation) : undefined,
      spo2: formData.oxygenSaturation ? parseFloat(formData.oxygenSaturation) : undefined, // Alias for oxygenSaturation
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      bmi: calculatedBMI !== '-' ? parseFloat(calculatedBMI) : undefined,
      bsa: calculatedBSA !== '-' ? parseFloat(calculatedBSA) : undefined,
      eGFR: calculatedeGFR !== '-' ? parseFloat(calculatedeGFR) : undefined,
      notes: formData.notes || undefined,
      details, // Include the details array for display components
    };

    saveMutation.mutate({
      visitId: currentVisit.opdVisit.id!,
      vitals: vitalData as any,
    });
  };

  const calculateBMI = () => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height) / 100; // cm to m
    if (weight && height) {
      return (weight / (height * height)).toFixed(1);
    }
    return '-';
  };

  const calculateBSA = () => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    if (weight && height) {
      // Mosteller formula: sqrt(height(cm) * weight(kg) / 3600)
      return Math.sqrt((height * weight) / 3600).toFixed(2);
    }
    return '-';
  };

  const calculateeGFR = () => {
    const creatPromise = parseFloat(formData.serumCreatinine);

    // Calculate age from DOB
    let age = 0;
    if (currentPatient?.dateOfBirth) {
      const dob = new Date(currentPatient.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    const isFemale = currentPatient?.gender?.toLowerCase() === 'female';

    if (creatPromise && age) {
      // CKD-EPI formula
      // GFR = 141 * min(Scr/k, 1)^a * max(Scr/k, 1)^-1.209 * 0.993^Age * 1.018 [if female] * 1.159 [if black]
      // k = 0.7 (female), 0.9 (male)
      // a = -0.329 (female), -0.411 (male)

      const k = isFemale ? 0.7 : 0.9;
      const a = isFemale ? -0.329 : -0.411;
      const scr = creatPromise;

      const factor1 = Math.min(scr / k, 1) ** a;
      const factor2 = Math.max(scr / k, 1) ** -1.209;
      const factor3 = 0.993 ** age;
      const factor4 = isFemale ? 1.018 : 1;

      // Simplification: Not including race factor as it may not be available/standard
      const gfr = 141 * factor1 * factor2 * factor3 * factor4;
      return gfr.toFixed(1);
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Vital History */}
      {vitalHistory && vitalHistory.length > 0 && (
        <Card title="Recent Vitals" className="bg-blue-50">
          <div className="flex items-center gap-6 text-sm">
            {vitalHistory[0] && (
              <>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Last Visit:</span>
                  <span className="font-medium">
                    {vitalHistory[0].bloodPressureSystolic}/{vitalHistory[0].bloodPressureDiastolic} mmHg
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="font-medium">{vitalHistory[0].heartRate || vitalHistory[0].pulseRate} bpm</span>
                  <span className="text-gray-400">|</span>
                  <span className="font-medium">{vitalHistory[0].temperature}°F</span>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Vitals Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {VITAL_SIGNS.map((vital) => (
            <div key={vital.key}>
              <Input

                label={vital.label}
                name={vital.key}
                type="number"
                step={vital.step}
                value={formData[vital.key as keyof typeof formData] as string}
                onChange={handleChange}
                placeholder={`Enter ${vital.label.toLowerCase()}`}
                helperText={vital.unit}
              />
            </div>
          ))}

          {/* BMI Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-lg font-semibold">
              {calculateBMI()} {calculateBMI() !== '-' && 'kg/m²'}
            </div>
          </div>
        </div>

        {/* Metabolic & Kidney Function */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Metabolic & Kidney Function</h4>
          <div className="grid grid-cols-3 gap-6">
            <Input
              label="Serum Creatinine"
              name="serumCreatinine"
              type="number"
              step="0.1"
              value={formData.serumCreatinine}
              onChange={handleChange}
              placeholder="Enter value"
              helperText="mg/dL"
            />

            {/* BSA Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BSA (Body Surface Area)</label>
              <div className="w-full px-4 py-2 border border-blue-50 border-gray-300 rounded-lg bg-blue-50 text-lg font-semibold text-blue-700">
                {calculateBSA()} {calculateBSA() !== '-' && 'm²'}
              </div>
            </div>

            {/* eGFR Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">eGFR (Estimated)</label>
              <div className="w-full px-4 py-2 border border-indigo-50 border-gray-300 rounded-lg bg-indigo-50 text-lg font-semibold text-indigo-700">
                {calculateeGFR()} {calculateeGFR() !== '-' && 'mL/min/1.73m²'}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Additional notes about vitals..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saveMutation.isPending}
          >
            <Save className="w-5 h-5 mr-2" />
            {existingVitals ? 'Update Vitals' : 'Save Vitals'}
          </Button>
        </div>
      </form>
    </div>
  );
};
