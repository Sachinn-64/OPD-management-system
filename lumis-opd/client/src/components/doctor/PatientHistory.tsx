import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Calendar, Download, FileText, X, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { doctorService } from '../../services/doctorService';
import { consultationService } from '../../services/consultationService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const PatientHistory: React.FC = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);

  // Fetch doctor profile to get doctorId
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', user?.id],
    queryFn: () => doctorService.getByUserId(user?.id || ''),
    enabled: !!user?.id,
  });

  // Fetch all patients who visited this doctor
  const { data: patientHistory, isLoading } = useQuery({
    queryKey: ['patientHistory', doctorProfile?.id],
    queryFn: () => doctorService.getPatientHistory(doctorProfile?.id || ''),
    enabled: !!doctorProfile?.id,
  });

  // Fetch selected patient's visit details
  const { data: patientVisits, isLoading: isLoadingVisits } = useQuery({
    queryKey: ['patientVisits', selectedPatient?.patientId, doctorProfile?.id],
    queryFn: async () => {
      const data = await consultationService.getPatientVisitsByDoctor(
        selectedPatient?.patientId,
        doctorProfile?.id || ''
      );
      console.log('Patient visits data:', data);
      return data;
    },
    enabled: !!selectedPatient?.patientId && !!doctorProfile?.id,
  });

  // Filter patients by search
  const filteredPatients = patientHistory?.filter((p: any) => {
    const query = searchQuery.toLowerCase();
    const patientName = `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase();
    const uhid = p.patient.uhid?.toLowerCase() || '';
    return patientName.includes(query) || uhid.includes(query);
  }) || [];

  const downloadVisitReport = async (visitId: string, patientUhid: string, visitDate: string) => {
    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      
      // Fetch visit details
      const visit = await consultationService.getById(visitId);
      if (!visit) {
        alert('Visit not found');
        return;
      }

      // Get patient details
      const patient = selectedPatient?.patient;
      if (!patient) {
        alert('Patient information not available');
        return;
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Helper function for centered text
      const centerText = (text: string, y: number, fontSize: number = 12) => {
        doc.setFontSize(fontSize);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
      };

      // Header
      doc.setFont('helvetica', 'bold');
      centerText('LUMIS HEALTHCARE', yPos, 16);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      centerText('Consultation Report', yPos, 12);
      yPos += 10;

      // Line
      doc.setDrawColor(0, 150, 100);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Patient Info
      doc.setFontSize(10);
      doc.text(`Patient: ${patient.firstName} ${patient.lastName}`, margin, yPos);
      doc.text(`UHID: ${patientUhid}`, pageWidth / 2, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date(visitDate).toLocaleDateString()}`, margin, yPos);
      const age = calculateAge(patient.dateOfBirth);
      doc.text(`Age/Gender: ${age}y / ${patient.gender || 'N/A'}`, pageWidth / 2, yPos);
      yPos += 10;

      // Add visit data
      const addSection = (title: string, content: string) => {
        if (!content) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(title, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(content, pageWidth - 2 * margin);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 8;
      };

      // Add clinical data
      if (visit.histories && visit.histories.length > 0) {
        const chiefComplaint = visit.histories.find(h => h.historyType === 'CHIEF_COMPLAINT');
        if (chiefComplaint) addSection('Chief Complaint:', chiefComplaint.description || '');
      }

      if (visit.notes && visit.notes.length > 0) {
        const examination = visit.notes.find(n => n.noteType === 'EXAMINATION');
        if (examination) addSection('Examination:', examination.noteText || '');
      }

      if (visit.diagnoses && visit.diagnoses.length > 0) {
        const diagnosisText = visit.diagnoses.map(d => `${d.diagnosisType}: ${d.diagnosisText}`).join('\n');
        addSection('Diagnosis:', diagnosisText);
      }

      if (visit.prescriptions && visit.prescriptions.length > 0 && visit.prescriptions[0].items && visit.prescriptions[0].items.length > 0) {
        const prescText = visit.prescriptions[0].items.map((item: any) => 
          `${item.medicationName} - ${item.dosage || ''} - ${item.frequency} - ${item.duration}`
        ).join('\n');
        addSection('Prescription:', prescText);
      }

      if (visit.generalAdvice) addSection('General Advice:', visit.generalAdvice);
      if (visit.followUpPlan) addSection('Follow-up:', visit.followUpPlan);

      // Save PDF
      doc.save(`consultation_${patientUhid}_${visitDate}.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Search Bar */}
      <div className="p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or UHID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {selectedPatient && (
          <button
            onClick={() => setSelectedPatient(null)}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Back to patient list
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0">
        {!selectedPatient ? (
          // Patient List
          <div className="space-y-2">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery ? 'No patients found' : 'No patient history available'}
                </p>
              </div>
            ) : (
              filteredPatients.map((record: any) => (
                <div
                  key={record.patient.id}
                  onClick={() => setSelectedPatient(record)}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {record.patient.firstName} {record.patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          UHID: {record.patient.uhid} • {calculateAge(record.patient.dateOfBirth)}y •{' '}
                          {record.patient.gender}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Visits</p>
                      <p className="text-2xl font-bold text-emerald-600">{record.totalVisits || 0}</p>
                    </div>
                  </div>
                  {record.lastVisitDate && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last visit: {new Date(record.lastVisitDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // Visit History for Selected Patient
          <div className="space-y-4 w-full">
            {/* Patient Info Card */}
            <Card className="bg-linear-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-4 rounded-full">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span>UHID: {selectedPatient.patient.uhid}</span>
                    <span>Age: {calculateAge(selectedPatient.patient.dateOfBirth)}y</span>
                    <span>Gender: {selectedPatient.patient.gender}</span>
                    <span>Phone: {selectedPatient.patient.phone}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Visit Records */}
            <div className="w-full">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Consultation History ({patientVisits?.length || 0} visits)
              </h4>
              
              {isLoadingVisits ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              ) : patientVisits && patientVisits.length > 0 ? (
                <div className="space-y-3 w-full">
                  {patientVisits.map((visit: any) => (
                    <Card key={visit.id} className="hover:shadow-lg transition-shadow w-full">
                      <div className="space-y-3">
                        {/* Visit Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {new Date(visit.opdVisit?.visitDate || visit.appointmentDate).toLocaleDateString('en-IN', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(visit.opdVisit?.visitDate || visit.appointmentDate).toLocaleTimeString('en-IN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVisit(visit);
                                setShowVisitModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadVisitReport(
                                visit.opdVisit?.id || visit.id,
                                selectedPatient.patient.uhid,
                                new Date(visit.appointmentDate || visit.visitDate).toISOString().split('T')[0]
                              )}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>

                        {/* Chief Complaint */}
                        {visit.opdVisit?.chiefComplaint && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">Chief Complaint:</p>
                            <p className="text-sm text-gray-900">{visit.opdVisit.chiefComplaint}</p>
                          </div>
                        )}

                        {/* Vitals */}
                        {visit.opdVisit?.vitals && visit.opdVisit.vitals.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Vitals:</p>
                            <div className="grid grid-cols-4 gap-2">
                              {visit.opdVisit.vitals[0].details?.slice(0, 4).map((vital: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                                  <p className="text-gray-600 text-xs">{vital.vitalName}</p>
                                  <p className="font-semibold text-emerald-600">
                                    {vital.vitalValue} {vital.vitalUnit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {visit.opdVisit?.diagnoses && visit.opdVisit.diagnoses.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Diagnosis:</p>
                            <div className="space-y-1">
                              {visit.opdVisit.diagnoses.map((diagnosis: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                    {diagnosis.diagnosisType}
                                  </span>
                                  <span className="text-gray-900">{diagnosis.diagnosisText}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        {visit.opdVisit?.prescriptions && visit.opdVisit.prescriptions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Medications:</p>
                            <div className="space-y-1">
                              {visit.opdVisit.prescriptions.flatMap((prescription: any) => 
                                prescription.items?.map((item: any, idx: number) => {
                                  // Build compact prescription format: Drug Name - Dosage - Frequency - Duration
                                  const parts: string[] = [];
                                  
                                  // Drug name
                                  parts.push(item.drugName);
                                  
                                  // Dosage
                                  if (item.dosage) {
                                    parts.push(item.dosage);
                                  }
                                  
                                  // Frequency - convert to 0-0-1 format if needed
                                  if (item.frequency) {
                                    let freqDisplay = item.frequency;
                                    const freqLower = item.frequency.toLowerCase();
                                    
                                    // Convert common frequency formats to 0-0-1 style
                                    if (freqLower.includes('once') || freqLower.includes('1x') || freqLower === '1' || freqLower === 'once daily') {
                                      freqDisplay = '0-0-1';
                                    } else if (freqLower.includes('twice') || freqLower.includes('2x') || freqLower === '2' || freqLower === 'twice daily') {
                                      freqDisplay = '1-0-1';
                                    } else if (freqLower.includes('thrice') || freqLower.includes('three') || freqLower.includes('3x') || freqLower === '3' || freqLower === 'thrice daily') {
                                      freqDisplay = '1-1-1';
                                    } else if (freqLower.includes('four') || freqLower.includes('4x') || freqLower === '4') {
                                      freqDisplay = '1-1-1-1';
                                    }
                                    
                                    parts.push(freqDisplay);
                                  }
                                  
                                  // Duration
                                  if (item.durationDays) {
                                    parts.push(`${item.durationDays} days`);
                                  }
                                  
                                  // Build the prescription line with commas
                                  const prescriptionLine = parts.join(', ');
                                  
                                  return (
                                    <div key={item.id || idx} className="text-sm text-gray-700">
                                      {prescriptionLine}
                                    </div>
                                  );
                                }) || []
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No visit records found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visit Details Modal */}
      {showVisitModal && selectedVisit && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVisitModal(false);
              setSelectedVisit(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Visit Details</h3>
              <button
                onClick={() => {
                  setShowVisitModal(false);
                  setSelectedVisit(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Visit Header */}
              <div className="border-b pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedVisit.opdVisit?.visitDate || selectedVisit.appointmentDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedVisit.opdVisit?.visitDate || selectedVisit.appointmentDate).toLocaleTimeString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedVisit.opdVisit?.visitStatus === 'COMPLETED' 
                      ? 'bg-green-100 text-green-700' 
                      : selectedVisit.opdVisit?.visitStatus === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedVisit.opdVisit?.visitStatus || 'OPEN'}
                  </span>
                </div>
              </div>

              {/* Chief Complaint */}
              {selectedVisit.opdVisit?.chiefComplaint && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Chief Complaint:</p>
                  <p className="text-sm text-gray-900">{selectedVisit.opdVisit.chiefComplaint}</p>
                </div>
              )}

              {/* Clinical History */}
              {selectedVisit.opdVisit?.histories && selectedVisit.opdVisit.histories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Clinical History:</p>
                  <div className="space-y-2">
                    {selectedVisit.opdVisit.histories.map((history: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {history.historyType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}:
                        </p>
                        <p className="text-sm text-gray-900">{history.historyText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitals */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Vitals:</p>
                {selectedVisit.opdVisit?.vitals && selectedVisit.opdVisit.vitals.length > 0 ? (
                  <div className="space-y-3">
                    {selectedVisit.opdVisit.vitals.map((vitalRecord: any, vitalIdx: number) => (
                      <div key={vitalIdx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-600">
                            Recorded at: {new Date(vitalRecord.recordedAt).toLocaleString('en-IN')}
                          </p>
                          {vitalRecord.recordedBy && (
                            <p className="text-xs text-gray-500">
                              By: {vitalRecord.recordedBy.username || 'Staff'}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {vitalRecord.details?.map((vital: any, idx: number) => (
                            <div key={idx} className="bg-white p-2 rounded">
                              <p className="text-gray-600 text-xs mb-1">{vital.vitalName}</p>
                              <p className="font-semibold text-emerald-600">
                                {vital.vitalValue} {vital.vitalUnit || ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">N/A</p>
                )}
              </div>

              {/* Clinical Notes */}
              {selectedVisit.opdVisit?.notes && selectedVisit.opdVisit.notes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Clinical Notes:</p>
                  <div className="space-y-2">
                    {selectedVisit.opdVisit.notes.map((note: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {note.noteType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}:
                        </p>
                        <p className="text-sm text-gray-900">{note.noteText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedVisit.opdVisit?.diagnoses && selectedVisit.opdVisit.diagnoses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Diagnosis:</p>
                  <div className="space-y-2">
                    {selectedVisit.opdVisit.diagnoses.map((diagnosis: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-gray-50 p-3 rounded">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium whitespace-nowrap">
                          {diagnosis.diagnosisType}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{diagnosis.diagnosisText}</p>
                          {diagnosis.icdCode && (
                            <p className="text-xs text-gray-500 mt-1">ICD-10: {diagnosis.icdCode}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedVisit.opdVisit?.prescriptions && selectedVisit.opdVisit.prescriptions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Medications:</p>
                  <div className="space-y-3">
                    {selectedVisit.opdVisit.prescriptions.map((prescription: any, presIdx: number) => (
                      <div key={presIdx} className="bg-gray-50 p-4 rounded-lg">
                        {prescription.notes && (
                          <p className="text-xs text-gray-600 mb-2 italic">Note: {prescription.notes}</p>
                        )}
                        <div className="space-y-2">
                          {prescription.items?.map((item: any, itemIdx: number) => {
                            const parts: string[] = [];
                            parts.push(item.drugName);
                            if (item.dosage) parts.push(item.dosage);
                            if (item.frequency) {
                              let freqDisplay = item.frequency;
                              const freqLower = item.frequency.toLowerCase();
                              if (freqLower.includes('once') || freqLower.includes('1x') || freqLower === '1' || freqLower === 'once daily') {
                                freqDisplay = '0-0-1';
                              } else if (freqLower.includes('twice') || freqLower.includes('2x') || freqLower === '2' || freqLower === 'twice daily') {
                                freqDisplay = '1-0-1';
                              } else if (freqLower.includes('thrice') || freqLower.includes('three') || freqLower.includes('3x') || freqLower === '3' || freqLower === 'thrice daily') {
                                freqDisplay = '1-1-1';
                              } else if (freqLower.includes('four') || freqLower.includes('4x') || freqLower === '4') {
                                freqDisplay = '1-1-1-1';
                              }
                              parts.push(freqDisplay);
                            }
                            if (item.durationDays) parts.push(`${item.durationDays} days`);
                            const prescriptionLine = parts.join(', ');

                            return (
                              <div key={itemIdx} className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-sm font-medium text-gray-900 mb-1">{prescriptionLine}</p>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  {item.genericName && <p>Generic: {item.genericName}</p>}
                                  {item.route && <p>Route: {item.route}</p>}
                                  {item.quantity && <p>Quantity: {item.quantity}</p>}
                                  {item.beforeAfterFood && <p>Timing: {item.beforeAfterFood}</p>}
                                  {item.instructions && <p className="italic">Instructions: {item.instructions}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advice */}
              {(selectedVisit.opdVisit?.generalAdvice || selectedVisit.opdVisit?.dietaryAdvice || 
                selectedVisit.opdVisit?.activityAdvice || selectedVisit.opdVisit?.followUpPlan) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Advice & Follow-up:</p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedVisit.opdVisit.generalAdvice && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">General Advice:</p>
                        <p className="text-sm text-gray-900">{selectedVisit.opdVisit.generalAdvice}</p>
                      </div>
                    )}
                    {selectedVisit.opdVisit.dietaryAdvice && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Dietary Advice:</p>
                        <p className="text-sm text-gray-900">{selectedVisit.opdVisit.dietaryAdvice}</p>
                      </div>
                    )}
                    {selectedVisit.opdVisit.activityAdvice && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Activity Advice:</p>
                        <p className="text-sm text-gray-900">{selectedVisit.opdVisit.activityAdvice}</p>
                      </div>
                    )}
                    {selectedVisit.opdVisit.followUpPlan && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Follow-up Plan:</p>
                        <p className="text-sm text-gray-900">{selectedVisit.opdVisit.followUpPlan}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="primary"
                  onClick={() => downloadVisitReport(
                    selectedVisit.opdVisit?.id || selectedVisit.id,
                    selectedPatient.patient.uhid,
                    new Date(selectedVisit.appointmentDate || selectedVisit.visitDate).toISOString().split('T')[0]
                  )}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVisitModal(false);
                    setSelectedVisit(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
