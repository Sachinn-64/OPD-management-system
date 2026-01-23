import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Save, FileText } from 'lucide-react';
import { referralService, CreateReferralData } from '../../services/referralService';
import { doctorService } from '../../services/doctorService';
import { useAuthStore } from '../../store/authStore';
import { useConsultationStore } from '../../store/consultationStore';
import { HOSPITAL_INFO } from '../../config/constants';
import { Button } from '../ui/Button';

interface ReferralSectionProps {
  visitId: string;
}

export const ReferralSection: React.FC<ReferralSectionProps> = ({ visitId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentPatient } = useConsultationStore();
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch existing referral if any
  const { data: existingReferrals } = useQuery({
    queryKey: ['referrals', visitId],
    queryFn: () => referralService.getReferralsByVisit(visitId),
    enabled: !!visitId,
  });

  // Fetch doctor profile for auto-filling
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', user?.id],
    queryFn: () => doctorService.getByUserId(user?.id || ''),
    enabled: !!user?.id,
  });

  const existingReferral = existingReferrals?.[0];

  const [formData, setFormData] = useState<CreateReferralData>({
    opdVisitId: visitId,
    referringDoctorName: '',
    receivingDoctorName: '',
    receivingDoctorSpeciality: '',
    receivingDoctorHospital: '',
    date: new Date().toISOString().split('T')[0],
    patientName: '',
    patientAge: undefined,
    patientGender: '',
    provisionalDiagnosis: '',
    clinicalSummary: '',
    treatmentGiven: '',
    reasonForReferral: '',
    department: '',
    registrationNumber: '',
    contactPhone: '',
    contactEmail: '',
  });

  // Auto-populate form when data is available
  useEffect(() => {
    if (currentPatient && !existingReferral) {
      const age = currentPatient.dateOfBirth
        ? Math.floor((new Date().getTime() - new Date(currentPatient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : undefined;
      
      setFormData(prev => ({
        ...prev,
        patientName: prev.patientName || `${currentPatient.firstName} ${currentPatient.lastName}`.trim(),
        patientAge: prev.patientAge || age,
        patientGender: prev.patientGender || currentPatient.gender,
      }));
    }

    if (doctorProfile && !existingReferral) {
      const doctorName = `Dr. ${doctorProfile.firstName} ${doctorProfile.lastName}`;
      const primarySpecialty = doctorProfile.specialties?.find((s: any) => s.isPrimary)?.specialtyName || doctorProfile.specialties?.[0]?.specialtyName;
      
      setFormData(prev => ({
        ...prev,
        referringDoctorName: prev.referringDoctorName || doctorName,
        department: prev.department || primarySpecialty || '',
        registrationNumber: prev.registrationNumber || doctorProfile.registrationNumber || '',
        contactPhone: prev.contactPhone || '',
        contactEmail: prev.contactEmail || '',
      }));
    }

    if (existingReferral) {
      setFormData({
        opdVisitId: visitId,
        referringDoctorName: existingReferral.referringDoctorName || '',
        receivingDoctorName: existingReferral.receivingDoctorName || '',
        receivingDoctorSpeciality: existingReferral.receivingDoctorSpeciality || '',
        receivingDoctorHospital: existingReferral.receivingDoctorHospital || '',
        date: existingReferral.date ? new Date(existingReferral.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        patientName: existingReferral.patientName || '',
        patientAge: existingReferral.patientAge,
        patientGender: existingReferral.patientGender || '',
        provisionalDiagnosis: existingReferral.provisionalDiagnosis || '',
        clinicalSummary: existingReferral.clinicalSummary || '',
        treatmentGiven: existingReferral.treatmentGiven || '',
        reasonForReferral: existingReferral.reasonForReferral || '',
        department: existingReferral.department || '',
        registrationNumber: existingReferral.registrationNumber || '',
        contactPhone: existingReferral.contactPhone || '',
        contactEmail: existingReferral.contactEmail || '',
      });
    }
  }, [currentPatient, doctorProfile, existingReferral, visitId]);

  const createMutation = useMutation({
    mutationFn: (data: CreateReferralData) => referralService.createReferral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', visitId] });
      alert('Referral saved successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to save referral');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateReferralData }) =>
      referralService.updateReferral(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', visitId] });
      alert('Referral updated successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update referral');
    },
  });

  const handleChange = (field: keyof CreateReferralData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (existingReferral) {
      updateMutation.mutate({ id: existingReferral.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Referral Letter</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
          }
          body {
            font-family: 'Times New Roman', serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            line-height: 1.6;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .hospital-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .hospital-address {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .date {
            text-align: right;
            margin: 20px 0;
          }
          .recipient {
            margin: 20px 0;
          }
          .subject {
            margin: 20px 0;
            font-weight: bold;
          }
          .content {
            margin: 20px 0;
          }
          .section {
            margin: 15px 0;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .section-content {
            margin-left: 20px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #000;
            padding-top: 20px;
          }
          .signature {
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  if (!currentPatient) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>No patient selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-sm text-emerald-800">
          💡 Fill in the referral letter details. All fields are optional. Patient and doctor information will be auto-populated.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Doctor Name</label>
            <input
              type="text"
              value={formData.receivingDoctorName || ''}
              onChange={(e) => handleChange('receivingDoctorName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Dr. [Last Name]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Speciality / Hospital Name</label>
            <input
              type="text"
              value={formData.receivingDoctorSpeciality || ''}
              onChange={(e) => handleChange('receivingDoctorSpeciality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Speciality / Hospital Name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Doctor Hospital</label>
          <input
            type="text"
            value={formData.receivingDoctorHospital || ''}
            onChange={(e) => handleChange('receivingDoctorHospital', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Hospital Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referring Doctor Name (Editable)</label>
          <input
            type="text"
            value={formData.referringDoctorName || ''}
            onChange={(e) => handleChange('referringDoctorName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Dr. [Doctor Name]"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department || ''}
              onChange={(e) => handleChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Department"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reg. No.</label>
            <input
              type="text"
              value={formData.registrationNumber || ''}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Registration Number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provisional Diagnosis</label>
          <textarea
            value={formData.provisionalDiagnosis || ''}
            onChange={(e) => handleChange('provisionalDiagnosis', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Diagnosis"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brief Clinical Summary</label>
          <textarea
            value={formData.clinicalSummary || ''}
            onChange={(e) => handleChange('clinicalSummary', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Key complaints / findings"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Given</label>
          <textarea
            value={formData.treatmentGiven || ''}
            onChange={(e) => handleChange('treatmentGiven', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Brief treatment"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Referral</label>
          <textarea
            value={formData.reasonForReferral || ''}
            onChange={(e) => handleChange('reasonForReferral', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Specialist opinion / advanced care"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={formData.contactPhone || ''}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Phone / Email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={formData.contactEmail || ''}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Email"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="w-4 h-4" />
          {existingReferral ? 'Update' : 'Save'} Referral
        </Button>
      </div>

      {/* Print Template (Hidden) */}
      <div ref={printRef} className="hidden">
        <div className="header">
          <div className="hospital-name">{HOSPITAL_INFO.name}</div>
          <div className="hospital-address">
            {HOSPITAL_INFO.address} | Phone: {HOSPITAL_INFO.phone}
          </div>
        </div>

        <div className="date">
          Date: {formatDate(formData.date)}
        </div>

        <div className="recipient">
          To,<br />
          {formData.receivingDoctorName && `Dr. ${formData.receivingDoctorName.split('Dr. ').pop()}`}<br />
          {formData.receivingDoctorSpeciality || formData.receivingDoctorHospital || ''}
        </div>

        <div style={{ margin: '20px 0', borderTop: '1px solid #000', paddingTop: '10px' }}></div>

        <div className="subject">
          Subject: Referral of {formData.patientName || currentPatient.firstName + ' ' + currentPatient.lastName}
        </div>

        <div className="content">
          <p>
            Dear {formData.receivingDoctorName ? `Dr. ${formData.receivingDoctorName.split(' ').pop()}` : 'Doctor'},
          </p>

          <p>
            I am referring {formData.patientName || currentPatient.firstName + ' ' + currentPatient.lastName}, {formData.patientAge ? `${formData.patientAge}` : ''}/{formData.patientGender || currentPatient.gender}, for further evaluation and management.
          </p>

          {formData.provisionalDiagnosis && (
            <div className="section">
              <div className="section-title">Provisional Diagnosis:</div>
              <div className="section-content">{formData.provisionalDiagnosis}</div>
            </div>
          )}

          {formData.clinicalSummary && (
            <div className="section">
              <div className="section-title">Brief Clinical Summary:</div>
              <div className="section-content">{formData.clinicalSummary}</div>
            </div>
          )}

          {formData.treatmentGiven && (
            <div className="section">
              <div className="section-title">Treatment Given:</div>
              <div className="section-content">{formData.treatmentGiven}</div>
            </div>
          )}

          {formData.reasonForReferral && (
            <div className="section">
              <div className="section-title">Reason for Referral:</div>
              <div className="section-content">{formData.reasonForReferral}</div>
            </div>
          )}

          <p>Kindly evaluate and manage as appropriate.</p>
        </div>

        <div style={{ margin: '20px 0', borderTop: '1px solid #000', paddingTop: '10px' }}></div>

        <div className="footer">
          <div className="signature">
            <div><strong>Referring Doctor:</strong></div>
            <div>{formData.referringDoctorName || 'Dr. ' + (doctorProfile?.firstName || '') + ' ' + (doctorProfile?.lastName || '')}</div>
            {formData.department && <div><strong>Department:</strong> {formData.department}</div>}
            {formData.registrationNumber && <div><strong>Reg. No.:</strong> {formData.registrationNumber}</div>}
            {(formData.contactPhone || formData.contactEmail) && (
              <div>
                <strong>Contact:</strong> {[formData.contactPhone, formData.contactEmail].filter(Boolean).join(' / ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

