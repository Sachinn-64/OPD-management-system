import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';
import { consultationService } from '../../services/consultationService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VoiceInput } from '../ui/VoiceInput';
import { Card } from '../ui/Card';

export const DiagnosisForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentVisit, currentPatient } = useConsultationStore();

  const [formData, setFormData] = useState({
    diagnosisCode: '',
    diagnosisName: '',
    diagnosisType: 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'DIFFERENTIAL',
    severity: '',
    notes: '',
  });

  // Fetch existing diagnoses
  const { data: existingDiagnoses } = useQuery({
    queryKey: ['diagnoses', currentVisit?.opdVisit?.id],
    queryFn: () => consultationService.getDiagnosisByVisit(currentVisit!.opdVisit!.id),
    enabled: !!currentVisit?.opdVisit?.id,
  });

  // Fetch patient's diagnosis history
  const { data: diagnosisHistory } = useQuery({
    queryKey: ['diagnosisHistory', currentPatient?.id],
    queryFn: () => consultationService.getDiagnosisByPatient(currentPatient!.id),
    enabled: !!currentPatient?.id,
  });

  // Save diagnosis mutation
  const saveMutation = useMutation({
    mutationFn: consultationService.createDiagnosis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses', currentVisit?.opdVisit?.id] });
      queryClient.invalidateQueries({ queryKey: ['diagnosisHistory', currentPatient?.id] });
      // Reset form
      setFormData({
        diagnosisCode: '',
        diagnosisName: '',
        diagnosisType: 'PRIMARY',
        severity: '',
        notes: '',
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentVisit?.opdVisit?.id || !currentPatient || !formData.diagnosisName.trim()) return;

    saveMutation.mutate({
      visitId: currentVisit.opdVisit.id,
      patientId: currentPatient.id,
      diagnosisCode: formData.diagnosisCode || undefined,
      diagnosisName: formData.diagnosisName.trim(),
      diagnosisType: formData.diagnosisType,
      severity: formData.severity || undefined,
      notes: formData.notes || undefined,
    });
  };

  const diagnosisTypes = [
    { value: 'PRIMARY', label: 'Primary Diagnosis', color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'SECONDARY', label: 'Secondary Diagnosis', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'DIFFERENTIAL', label: 'Differential Diagnosis', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  ];

  const severityLevels = ['Mild', 'Moderate', 'Severe', 'Critical'];

  return (
    <div className="space-y-6">
      {/* Previous Diagnoses */}
      {diagnosisHistory && diagnosisHistory.length > 0 && (
        <Card title="Past Diagnoses" className="bg-amber-50">
          <div className="space-y-2">
            {diagnosisHistory.slice(0, 3).map((diagnosis, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium">
                  {diagnosis.diagnosisType}
                </div>
                <span className="font-medium text-gray-900">{diagnosis.diagnosisName}</span>
                {diagnosis.severity && (
                  <span className="text-gray-600">({diagnosis.severity})</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Diagnosis Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="ICD Code (Optional)"
            name="diagnosisCode"
            value={formData.diagnosisCode}
            onChange={handleChange}
            placeholder="e.g., E11.9"
          />

          <Input
            label="Diagnosis Name"
            name="diagnosisName"
            value={formData.diagnosisName}
            onChange={handleChange}
            placeholder="e.g., Type 2 Diabetes Mellitus"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnosis Type <span className="text-red-500">*</span>
            </label>
            <select
              name="diagnosisType"
              value={formData.diagnosisType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {diagnosisTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select severity</option>
              {severityLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clinical Notes
            <span className="ml-2 text-xs text-emerald-600 font-normal">
              (Voice input supported)
            </span>
          </label>
          <VoiceInput
            value={formData.notes}
            onChange={(value) => setFormData((prev) => ({ ...prev, notes: value }))}
            placeholder="Additional notes about the diagnosis..."
          />
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saveMutation.isPending}
            disabled={!formData.diagnosisName.trim()}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Diagnosis
          </Button>
        </div>
      </form>

      {/* Saved Diagnoses */}
      {existingDiagnoses && existingDiagnoses.length > 0 && (
        <Card title="Current Visit Diagnoses" className="mt-8">
          <div className="space-y-4">
            {existingDiagnoses.map((diagnosis, index) => {
              const typeConfig = diagnosisTypes.find((t) => t.value === diagnosis.diagnosisType);
              return (
                <div key={index} className={`border-2 rounded-lg p-4 ${typeConfig?.color}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{diagnosis.diagnosisName}</h4>
                      {diagnosis.diagnosisCode && (
                        <p className="text-sm opacity-75">Code: {diagnosis.diagnosisCode}</p>
                      )}
                    </div>
                    {diagnosis.severity && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white bg-opacity-50">
                        {diagnosis.severity}
                      </span>
                    )}
                  </div>
                  {diagnosis.notes && (
                    <p className="text-sm mt-2 whitespace-pre-wrap">{diagnosis.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
