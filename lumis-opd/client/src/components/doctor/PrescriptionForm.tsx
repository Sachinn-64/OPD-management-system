import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus } from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';
import { consultationService } from '../../services/consultationService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VoiceInput } from '../ui/VoiceInput';
import { Card } from '../ui/Card';

export const PrescriptionForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentVisit, currentPatient } = useConsultationStore();

  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  // Fetch existing prescriptions
  const { data: existingPrescriptions } = useQuery({
    queryKey: ['prescriptions', currentVisit?.opdVisit?.id],
    queryFn: () => consultationService.getPrescriptionsByVisit(currentVisit!.opdVisit!.id!),
    enabled: !!currentVisit?.opdVisit?.id,
  });

  // Save prescription mutation
  const saveMutation = useMutation({
    mutationFn: consultationService.createPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', currentVisit?.opdVisit?.id] });
      // Reset form
      setFormData({
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentVisit?.opdVisit?.id || !currentPatient) return;

    if (!formData.medicationName.trim() || !formData.dosage || !formData.frequency || !formData.duration) {
      return;
    }

    saveMutation.mutate({
      visitId: currentVisit.opdVisit.id!,
      patientId: currentPatient.id!,
      items: [{
        medicationName: formData.medicationName.trim(),
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions || undefined,
      }],
    });
  };

  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime',
  ];

  const durationOptions = [
    '3 days',
    '5 days',
    '7 days',
    '10 days',
    '14 days',
    '1 month',
    '2 months',
    '3 months',
    'Ongoing',
  ];

  return (
    <div className="space-y-6">
      {/* Prescription Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Medication Name"
            name="medicationName"
            value={formData.medicationName}
            onChange={handleChange}
            placeholder="e.g., Metformin"
            required
          />

          <Input
            label="Dosage"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            placeholder="e.g., 500mg"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select frequency</option>
              {frequencyOptions.map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration <span className="text-red-500">*</span>
            </label>
            <select
              name="duration"
              value={formData.duration}
              onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select duration</option>
              {durationOptions.map((dur) => (
                <option key={dur} value={dur}>
                  {dur}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructions
            <span className="ml-2 text-xs text-emerald-600 font-normal">
              (Voice input supported)
            </span>
          </label>
          <VoiceInput
            value={formData.instructions}
            onChange={(value) => setFormData((prev) => ({ ...prev, instructions: value }))}
            placeholder="Special instructions for the patient..."
          />
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saveMutation.isPending}
            disabled={
              !formData.medicationName.trim() ||
              !formData.dosage ||
              !formData.frequency ||
              !formData.duration
            }
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Medication
          </Button>
        </div>
      </form>

      {/* Prescription List */}
      {existingPrescriptions && existingPrescriptions.length > 0 && (
        <Card title="Current Prescription" className="mt-8">
          <div className="space-y-4">
            {existingPrescriptions.map((prescription, index) => (
              <div
                key={index}
                className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 p-2 rounded-lg">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">
                        {prescription.medicationName}
                      </h4>
                      <p className="text-sm text-gray-600">{prescription.dosage}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-emerald-700">{prescription.frequency}</p>
                    <p className="text-gray-600">for {prescription.duration}</p>
                  </div>
                </div>

                {prescription.instructions && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Instructions: </span>
                      {prescription.instructions}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Print Prescription Button */}
          <div className="mt-6 flex items-center justify-end">
            <Button variant="outline" size="md">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Prescription
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
