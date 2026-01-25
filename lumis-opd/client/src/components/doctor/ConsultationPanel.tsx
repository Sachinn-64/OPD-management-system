import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import {
  User,
  Activity,
  FileText,
  Stethoscope,
  Pill,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Download,
  X,
  History as HistoryIcon,
  RefreshCw,
  Clock,
  Edit3,
  Save,
  Award,
  ExternalLink,
  Calendar,
  Eye,
  Thermometer,
  Printer,
} from 'lucide-react';
import { useConsultationStore } from '../../store/consultationStore';
import { useAuthStore } from '../../store/authStore';
import { appointmentService } from '../../services/appointmentService';
import { consultationService } from '../../services/consultationService';
import { doctorService } from '../../services/doctorService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { VitalsForm } from './VitalsForm';
import { VitalsDisplay } from './VitalsDisplay';
import { NotesSection } from './NotesSection';
import { HistorySection } from './HistorySection';
import { DiagnosisSection } from './DiagnosisSection';
import { PrescriptionSection } from './PrescriptionSection';
import { AdviceSection } from './AdviceSection';
import { PrescriptionPrint } from './PrescriptionPrint';

// Types for form data
interface NotesData {
  chiefComplaint?: string;
  examination?: string;
}

interface HistoryData {
  presentIllness?: string;
  pastMedical?: string;
  family?: string;
  allergies?: string;
  addiction?: string;
}

interface DiagnosisData {
  diagnoses: Array<{
    id: string;
    type: 'PROVISIONAL' | 'FINAL' | 'DIFFERENTIAL';
    icdCode?: string;
    diagnosisText: string;
  }>;
  assessment: string;
  followUp: string;
}

interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage?: string;
  frequency: string;
  timing: string;
  durationDays: number;
  instructions?: string;
}

interface AdviceData {
  generalAdvice?: string;
  dietaryAdvice?: string;
  activityAdvice?: string;
}

export const ConsultationPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    currentVisit,
    currentPatient,
    nextPatient,
    previousPatient,
    selectedQueueIndex,
    todayQueue,
  } = useConsultationStore();

  // State for viewing a specific visit in the records modal

  const [selectedRecordVisit, setSelectedRecordVisit] = useState<any>(null);

  // Fetch doctor profile to get doctorId
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', user?.id],
    queryFn: () => doctorService.getByUserId(user?.id || ''),
    enabled: !!user?.id,
  });

  // Fetch patient's previous visits when modal opens
  const { data: patientVisits, isLoading: isLoadingVisits } = useQuery({
    queryKey: ['patientVisits', currentPatient?.id, doctorProfile?.id],
    queryFn: () => consultationService.getPatientVisitsByDoctor(
      currentPatient?.id || '',
      doctorProfile?.id || ''
    ),
    enabled: !!currentPatient?.id && !!doctorProfile?.id,
  });

  // Fetch vitals for printing
  const { data: vitalsData } = useQuery({
    queryKey: ['appointmentVitals', currentVisit?.opdVisit?.id],
    queryFn: () => consultationService.getVitalsByVisit(currentVisit!.opdVisit!.id!),
    enabled: !!currentVisit?.opdVisit?.id,
  });

  // Extract vitals for printing
  const getPrintVitals = () => {
    interface VitalDetail {
      vitalName: string;
      vitalValue: string | number;
    }
    interface VitalRecord {
      details?: VitalDetail[];
      bloodPressureSystolic?: string | number;
      bloodPressureDiastolic?: string | number;
      heartRate?: string | number;
      oxygenSaturation?: string | number;
      weight?: string | number;
      height?: string | number;
      [key: string]: unknown;
    }
    const vitalsArray = vitalsData as unknown as VitalRecord[];
    if (!vitalsArray || !Array.isArray(vitalsArray) || vitalsArray.length === 0) return undefined;
    const latestVitals = vitalsArray[0];

    const getVital = (name: string) => {
      const detail = latestVitals.details?.find((d) => d.vitalName === name);
      return detail ? detail.vitalValue : undefined;
    };

    // Try to get systolic/diastolic from direct fields first, then from details
    let systolicBP = latestVitals.bloodPressureSystolic?.toString() || getVital('BP Systolic') || getVital('Systolic');
    let diastolicBP = latestVitals.bloodPressureDiastolic?.toString() || getVital('BP Diastolic') || getVital('Diastolic');

    // Fallback: Parse from combined "Blood Pressure" value (format: "120/80")
    const bpValue = getVital('Blood Pressure');
    if (!systolicBP && !diastolicBP && bpValue) {
      const bpStr = String(bpValue);
      const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
      if (bpMatch) {
        systolicBP = bpMatch[1];
        diastolicBP = bpMatch[2];
      }
    }

    return {
      heartRate: (latestVitals.heartRate?.toString() || getVital('Heart Rate'))?.toString(),
      bloodPressure: bpValue?.toString(),
      systolicBP: systolicBP?.toString(),
      diastolicBP: diastolicBP?.toString(),
      oxygenSaturation: (latestVitals.oxygenSaturation?.toString() || getVital('Oxygen Saturation'))?.toString(),
      weight: (latestVitals.weight?.toString() || getVital('Weight'))?.toString(),
      height: (latestVitals.height?.toString() || getVital('Height'))?.toString(),
      bsa: getVital('BSA')?.toString(),
      eGFR: getVital('eGFR')?.toString(),
    };
  };

  // Get doctor info for printing
  const getDoctorInfo = () => {
    if (!doctorProfile) return undefined;
    interface DoctorProfile {
      fullName?: string;
      firstName?: string;
      lastName?: string;
      specialty?: string;
      specialization?: string;
      registrationNumber?: string;
      registrationNo?: string;
      [key: string]: unknown;
    }
    const doc = doctorProfile as unknown as DoctorProfile;
    return {
      name: doc.fullName || `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
      specialty: doc.specialty || doc.specialization,
      registrationNo: doc.registrationNumber || doc.registrationNo,
    };
  };

  const [activeTab, setActiveTab] = useState<'notes' | 'history' | 'diagnosis' | 'prescription' | 'advice'>('notes');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Certificate form state
  const [certificateType, setCertificateType] = useState<'fitness' | 'leave' | 'sick'>('fitness');
  const [certificateFromDate, setCertificateFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [certificateToDate, setCertificateToDate] = useState(new Date().toISOString().split('T')[0]);
  const [certificateReason, setCertificateReason] = useState('');
  const [certificateRemarks, setCertificateRemarks] = useState('');

  // Referral form state
  const [referralType, setReferralType] = useState<'specialist' | 'hospital' | 'higher'>('specialist');
  const [referTo, setReferTo] = useState('');
  const [referralSpecialty, setReferralSpecialty] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referralPriority, setReferralPriority] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [referralSummary, setReferralSummary] = useState('');

  const [isCompleting, setIsCompleting] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPreviousRecords, setShowPreviousRecords] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0); // Trigger to reload data

  // Print prescription state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLanguage, setPrintLanguage] = useState<'en' | 'hi' | 'mr' | 'kn'>('en');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSections, setPrintSections] = useState({
    chiefComplaint: true,
    vitals: true,
    prescription: true,
    assessment: true,
    advice: true,
    followUp: true,
    diagnosis: false,
    history: false,
  });

  // Form data state - persists across tab switches
  const [notesData, setNotesData] = useState<NotesData>({});
  const [historyData, setHistoryData] = useState<HistoryData>({});
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>({ diagnoses: [], assessment: '', followUp: '' });
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionItem[]>([]);
  const [adviceData, setAdviceData] = useState<AdviceData>({});
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load existing consultation data when patient changes
  // Only load data if the visit is from TODAY and has data (completed or in-progress)
  useEffect(() => {
    const loadExistingData = async () => {
      if (!currentVisit?.opdVisit?.id) {
        // Clear form data when no visit
        setNotesData({});
        setHistoryData({});
        setDiagnosisData({ diagnoses: [], assessment: '', followUp: '' });
        setPrescriptionData([]);
        setAdviceData({});
        return;
      }

      const visitId = currentVisit.opdVisit.id;
      // Use appointmentDate from the main visit object (more reliable)
      const visitDate = new Date(currentVisit.appointmentDate || currentVisit.opdVisit.visitDate);
      const today = new Date();

      // Check if visit is from today (comparing date parts only)
      const isTodayVisit =
        visitDate.getFullYear() === today.getFullYear() &&
        visitDate.getMonth() === today.getMonth() &&
        visitDate.getDate() === today.getDate();

      // Only load existing data if it's today's visit and has been started/completed
      const visitStatus = currentVisit.opdVisit.visitStatus;
      const shouldLoadData = isTodayVisit && (visitStatus === 'COMPLETED' || visitStatus === 'IN_PROGRESS');

      console.log('Load data check:', { visitId, visitDate: visitDate.toDateString(), today: today.toDateString(), isTodayVisit, visitStatus, shouldLoadData });

      if (!shouldLoadData) {
        // Clear form for new visits or visits from other days
        setNotesData({});
        setHistoryData({});
        setDiagnosisData({ diagnoses: [], assessment: '', followUp: '' });
        setPrescriptionData([]);
        setAdviceData({});
        return;
      }

      setIsLoadingData(true);
      try {
        // Fetch all existing data in parallel
        const [histories, notes, diagnoses, prescriptions] = await Promise.all([
          consultationService.getHistoryByVisit(visitId).catch((e) => { console.error('History fetch error:', e); return []; }),
          consultationService.getNotesByVisit(visitId).catch((e) => { console.error('Notes fetch error:', e); return []; }),
          consultationService.getDiagnosisByVisit(visitId).catch((e) => { console.error('Diagnosis fetch error:', e); return []; }),
          consultationService.getPrescriptionsByVisit(visitId).catch((e) => { console.error('Prescription fetch error:', e); return []; }),
        ]);

        console.log('Fetched data:', { histories, notes, diagnoses, prescriptions });

        // Parse clinical history - only take the FIRST (most recent) entry for each type
        // since data is ordered by recordedAt DESC
        const parsedHistory: HistoryData = {};
        const parsedNotes: NotesData = {};

        for (const history of histories || []) {
          const historyType = (history as any).historyType;
          // Handle both field names - description (new) and historyText (legacy)
          const text = (history as any).description || (history as any).historyText;

          console.log('Parsing history:', { historyType, text });

          // Only set if not already set (take the newest/first entry)
          switch (historyType) {
            case 'CHIEF_COMPLAINT':
              if (!parsedNotes.chiefComplaint) parsedNotes.chiefComplaint = text;
              break;
            case 'PRESENT_ILLNESS':
              if (!parsedHistory.presentIllness) parsedHistory.presentIllness = text;
              break;
            case 'PAST_MEDICAL':
              if (!parsedHistory.pastMedical) parsedHistory.pastMedical = text;
              break;
            case 'FAMILY':
              if (!parsedHistory.family) parsedHistory.family = text;
              break;
            case 'ALLERGY':
              if (!parsedHistory.allergies) parsedHistory.allergies = text;
              break;
            case 'ADDICTION':
              if (!parsedHistory.addiction) parsedHistory.addiction = text;
              break;
          }
        }

        // Parse clinical notes - only take the FIRST (most recent) entry for each type
        let assessmentNote = '';
        let followUpNote = '';
        for (const note of notes || []) {
          const noteType = (note as any).noteType;
          // Handle both field names - noteText (stored) and content (alias)
          const text = (note as any).noteText || (note as any).content;

          console.log('Parsing note:', { noteType, text });

          // Only set if not already set (take the newest/first entry)
          switch (noteType) {
            case 'EXAMINATION':
              if (!parsedNotes.examination) parsedNotes.examination = text;
              break;
            case 'ASSESSMENT':
              if (!assessmentNote) assessmentNote = text;
              break;
            case 'FOLLOW_UP':
              if (!followUpNote) followUpNote = text;
              break;
          }
        }

        // Parse diagnoses
        const parsedDiagnoses = (diagnoses || []).map((d: any) => ({
          id: d.id,
          type: (d.diagnosisType === 'FINAL' ? 'FINAL' : d.diagnosisType === 'PROVISIONAL' ? 'PROVISIONAL' : 'DIFFERENTIAL') as 'PROVISIONAL' | 'FINAL' | 'DIFFERENTIAL',
          icdCode: d.icdCode || d.diagnosisCode,
          diagnosisText: d.diagnosisText || d.diagnosisName,
        }));

        // Parse prescriptions
        const parsedPrescriptions: PrescriptionItem[] = [];
        for (const prescription of prescriptions || []) {
          const items = (prescription as any).items || [];
          for (const item of items) {
            parsedPrescriptions.push({
              id: item.id || crypto.randomUUID(),
              drugName: item.drugName || item.medicationName,
              dosage: item.dosage,
              frequency: item.frequency,
              timing: item.beforeAfterFood || 'BEFORE',
              durationDays: item.durationDays || parseInt(item.duration) || 5,
              instructions: item.instructions,
            });
          }
        }

        // Load advice from opdVisit
        const adviceFromVisit: AdviceData = {
          generalAdvice: currentVisit.opdVisit.generalAdvice || '',
          dietaryAdvice: currentVisit.opdVisit.dietaryAdvice || '',
          activityAdvice: currentVisit.opdVisit.activityAdvice || '',
        };

        console.log('Parsed data to set:', { parsedNotes, parsedHistory, parsedDiagnoses, parsedPrescriptions, adviceFromVisit });

        // Set all the parsed data
        setNotesData(parsedNotes);
        setHistoryData(parsedHistory);
        setDiagnosisData({
          diagnoses: parsedDiagnoses,
          assessment: assessmentNote,
          followUp: followUpNote || currentVisit.opdVisit.followUpPlan || '',
        });
        setPrescriptionData(parsedPrescriptions);
        setAdviceData(adviceFromVisit);
      } catch (error) {
        console.error('Error loading existing consultation data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadExistingData();
  }, [currentVisit?.opdVisit?.id, currentVisit?.opdVisit?.visitStatus, currentVisit?.appointmentDate, dataRefreshTrigger]);

  // Callbacks for child components to update form data
  const handleNotesChange = useCallback((data: NotesData) => {
    setNotesData(data);
  }, []);

  const handleHistoryChange = useCallback((data: HistoryData) => {
    setHistoryData(data);
  }, []);

  const handleDiagnosisChange = useCallback((data: DiagnosisData) => {
    setDiagnosisData(data);
  }, []);

  const handlePrescriptionChange = useCallback((data: PrescriptionItem[]) => {
    setPrescriptionData(data);
  }, []);

  const handleAdviceChange = useCallback((data: AdviceData) => {
    setAdviceData(data);
  }, []);

  // Get store action to update currentVisit
  const { setCurrentVisit } = useConsultationStore();

  // Update visit status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ visitId, status }: { visitId: string; status: string }) =>
      appointmentService.updateVisitStatus(visitId, status as any),
    onSuccess: (_data, variables) => {
      // Update the currentVisit in the store with the new status
      if (currentVisit) {
        setCurrentVisit({
          ...currentVisit,
          opdVisit: currentVisit.opdVisit ? {
            ...currentVisit.opdVisit,
            visitStatus: variables.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
          } : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['todayQueue'] });
    },
  });

  // Start consultation
  const handleStartConsultation = () => {
    // Use opdVisit.id if available, otherwise fall back to appointment id
    const visitId = currentVisit?.opdVisit?.id || currentVisit?.id;
    console.log('Starting consultation, visitId:', visitId);

    if (visitId) {
      updateStatusMutation.mutate({
        visitId,
        status: 'IN_PROGRESS',
      });
    } else {
      console.error('No visit ID available to start consultation');
    }
  };

  // Complete consultation
  const handleCompleteConsultation = async () => {
    const visitId = currentVisit?.opdVisit?.id;
    if (!visitId || !currentPatient) {
      console.error('Cannot complete consultation - missing visitId or patient');
      return;
    }

    setIsCompleting(true);
    try {
      const patientId = currentPatient.id;

      // Save clinical notes (chief complaint as history, examination as note)
      if (notesData.chiefComplaint) {
        // Chief complaint is a history type, not a note type
        await consultationService.createHistory({
          opdVisitId: visitId,
          historyType: 'CHIEF_COMPLAINT',
          description: notesData.chiefComplaint,
        });
      }
      if (notesData.examination) {
        await consultationService.createNote({
          visitId,
          patientId,
          noteType: 'EXAMINATION',
          content: notesData.examination,
        });
      }

      // Save clinical history entries
      const historyTypes = [
        { key: 'presentIllness', type: 'PRESENT_ILLNESS' },
        { key: 'pastMedical', type: 'PAST_MEDICAL' },
        { key: 'family', type: 'FAMILY' },
        { key: 'allergies', type: 'ALLERGY' },
        { key: 'addiction', type: 'ADDICTION' },
      ] as const;

      for (const { key, type } of historyTypes) {
        const value = historyData[key as keyof HistoryData];
        if (value && value.trim()) {
          await consultationService.createHistory({
            opdVisitId: visitId,
            historyType: type,
            description: value,
          });
        }
      }

      // Save diagnoses
      for (const diagnosis of diagnosisData.diagnoses) {
        if (diagnosis.diagnosisText.trim()) {
          await consultationService.createDiagnosis({
            visitId,
            patientId,
            diagnosisName: diagnosis.diagnosisText,
            diagnosisType: diagnosis.type === 'PROVISIONAL' ? 'SECONDARY' : diagnosis.type === 'FINAL' ? 'PRIMARY' : 'DIFFERENTIAL',
            diagnosisCode: diagnosis.icdCode,
          });
        }
      }

      // Save assessment and follow-up as clinical notes
      if (diagnosisData.assessment) {
        await consultationService.createNote({
          visitId,
          patientId,
          noteType: 'ASSESSMENT',
          content: diagnosisData.assessment,
        });
      }
      if (diagnosisData.followUp) {
        await consultationService.createNote({
          visitId,
          patientId,
          noteType: 'FOLLOW_UP',
          content: diagnosisData.followUp,
        });
      }

      // Save prescriptions
      const validPrescriptions = prescriptionData.filter(item => item.drugName && item.drugName.trim());
      if (validPrescriptions.length > 0) {
        await consultationService.createPrescription({
          visitId,
          patientId,
          items: validPrescriptions.map(item => ({
            medicationName: item.drugName,
            dosage: item.dosage || '',
            frequency: item.frequency,
            duration: item.durationDays.toString(),
            instructions: item.instructions,
            beforeAfterFood: item.timing,
          })),
        });
      }

      // Save advice to OpdVisit
      if (adviceData.generalAdvice || adviceData.dietaryAdvice || adviceData.activityAdvice || diagnosisData.followUp) {
        await consultationService.updateVisitAdvice(visitId, {
          generalAdvice: adviceData.generalAdvice,
          dietaryAdvice: adviceData.dietaryAdvice,
          activityAdvice: adviceData.activityAdvice,
          followUpPlan: diagnosisData.followUp,
        });
      }

      // Mark visit as completed in backend
      await updateStatusMutation.mutateAsync({
        visitId: visitId,
        status: 'COMPLETED',
      });

      // Invalidate all related queries to refresh patient history
      await queryClient.invalidateQueries({ queryKey: ['todayQueue'] });
      await queryClient.invalidateQueries({ queryKey: ['patientHistory'] });
      await queryClient.invalidateQueries({ queryKey: ['patientVisits'] });

      // Reset form data for next patient
      setNotesData({});
      setHistoryData({});
      setDiagnosisData({ diagnoses: [], assessment: '', followUp: '' });
      setPrescriptionData([]);
      setAdviceData({});

      // Show PDF download modal after successful completion
      setIsCompleting(false);
      setShowPdfModal(true);
    } catch (error: any) {
      console.error('Error completing consultation:', error);
      console.error('Error details:', error?.message, error?.code);
      console.error('Visit ID used:', visitId);
      console.error('Current visit:', currentVisit);
      setIsCompleting(false);
      alert(`Failed to complete consultation: ${error?.message || 'Unknown error'}. Please try again.`);
    }
  };

  // Generate PDF report (client-side with jsPDF)
  const generateConsultationPDF = async () => {
    if (!currentVisit?.opdVisit?.id || !currentPatient) return;
    setIsDownloadingPdf(true);

    try {
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

      // Helper to add section
      const addSection = (title: string, content: string | string[]) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(title, margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const textContent = Array.isArray(content) ? content.join('\n') : content;
        const lines = doc.splitTextToSize(textContent, pageWidth - 2 * margin);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 8;
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
      doc.text(`Patient: ${currentPatient.firstName} ${currentPatient.lastName}`, margin, yPos);
      doc.text(`UHID: ${currentPatient.uhid || 'N/A'}`, pageWidth / 2, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
      // Calculate age from dateOfBirth
      const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
      };
      const patientAge = currentPatient.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : 'N/A';
      doc.text(`Age/Gender: ${patientAge} / ${currentPatient.gender || 'N/A'}`, pageWidth / 2, yPos);
      yPos += 10;

      // Chief Complaint
      if (notesData.chiefComplaint) {
        addSection('Chief Complaint:', notesData.chiefComplaint);
      }

      // Examination
      if (notesData.examination) {
        addSection('Examination:', notesData.examination);
      }

      // Vitals
      const visit = currentVisit.opdVisit;
      if (visit?.vitals && visit.vitals.length > 0) {
        const vitals = visit.vitals[0];
        const vitalsText = [
          vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic ? `BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg` : '',
          vitals.pulseRate ? `Pulse: ${vitals.pulseRate} bpm` : '',
          vitals.temperature ? `Temp: ${vitals.temperature}°F` : '',
          vitals.weight ? `Weight: ${vitals.weight} kg` : '',
          vitals.spo2 || vitals.oxygenSaturation ? `SpO2: ${vitals.spo2 || vitals.oxygenSaturation}%` : '',
        ].filter(Boolean).join(', ');

        if (vitalsText) {
          addSection('Vitals:', vitalsText);
        }
      }

      // Diagnosis
      if (diagnosisData.diagnoses && diagnosisData.diagnoses.length > 0) {
        const diagnosisText = diagnosisData.diagnoses.map(d =>
          `${d.diagnosisText}${d.icdCode ? ` (${d.icdCode})` : ''} - ${d.type}`
        );
        addSection('Diagnosis:', diagnosisText);
      }

      // Assessment
      if (diagnosisData.assessment) {
        addSection('Assessment:', diagnosisData.assessment);
      }

      // Prescription
      if (prescriptionData && prescriptionData.length > 0) {
        const rxText = prescriptionData.filter(p => p.drugName).map((p, i) =>
          `${i + 1}. ${p.drugName} - ${p.dosage || ''} - ${p.frequency} - ${p.durationDays} days${p.instructions ? ` (${p.instructions})` : ''}`
        );
        addSection('Prescription:', rxText);
      }

      // Advice
      const adviceItems = [
        adviceData.generalAdvice ? `General: ${adviceData.generalAdvice}` : '',
        adviceData.dietaryAdvice ? `Diet: ${adviceData.dietaryAdvice}` : '',
        adviceData.activityAdvice ? `Activity: ${adviceData.activityAdvice}` : '',
      ].filter(Boolean);

      if (adviceItems.length > 0) {
        addSection('Advice:', adviceItems);
      }

      // Follow-up
      if (diagnosisData.followUp) {
        addSection('Follow-up:', diagnosisData.followUp);
      }

      // Footer
      yPos = doc.internal.pageSize.getHeight() - 30;
      doc.setDrawColor(0, 150, 100);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      centerText('This is a computer-generated document', yPos, 9);

      // Save PDF
      doc.save(`consultation_${currentPatient.uhid || 'patient'}_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsDownloadingPdf(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsDownloadingPdf(false);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  // Generate Medical Certificate PDF
  const generateCertificatePDF = () => {
    if (!currentPatient) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper function for centered text
    const centerText = (text: string, y: number, fontSize: number = 12) => {
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Header
    doc.setFont('helvetica', 'bold');
    centerText('LUMIS HEALTHCARE', 20, 18);
    doc.setFont('helvetica', 'normal');
    centerText('Medical Certificate', 30, 14);

    // Date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 45);

    // Certificate type
    const certTypeLabels: Record<string, string> = {
      fitness: 'Medical Fitness Certificate',
      leave: 'Medical Leave Certificate',
      sick: 'Sick Leave Certificate',
    };

    doc.setFont('helvetica', 'bold');
    centerText(certTypeLabels[certificateType] || 'Medical Certificate', 60, 14);

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const patientName = `${currentPatient.firstName} ${currentPatient.lastName}`;
    const patientAge = currentPatient.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : 'N/A';
    const patientGender = currentPatient.gender || 'N/A';
    const uhid = currentPatient.uhid || 'N/A';

    let bodyText = '';

    if (certificateType === 'fitness') {
      bodyText = `This is to certify that ${patientName}, aged ${patientAge} years, gender ${patientGender} (UHID: ${uhid}), was examined on ${new Date().toLocaleDateString('en-IN')} and is found to be medically fit.`;
    } else {
      bodyText = `This is to certify that ${patientName}, aged ${patientAge} years, gender ${patientGender} (UHID: ${uhid}), is under my medical care and requires rest from ${certificateFromDate} to ${certificateToDate}.`;
    }

    const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
    doc.text(splitBody, 20, 80);

    let yPos = 80 + (splitBody.length * 6);

    // Reason/Diagnosis
    if (certificateReason) {
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnosis/Reason:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const splitReason = doc.splitTextToSize(certificateReason, pageWidth - 40);
      doc.text(splitReason, 20, yPos + 7);
      yPos += 7 + (splitReason.length * 6);
    }

    // Remarks
    if (certificateRemarks) {
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Remarks:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const splitRemarks = doc.splitTextToSize(certificateRemarks, pageWidth - 40);
      doc.text(splitRemarks, 20, yPos + 7);
      yPos += 7 + (splitRemarks.length * 6);
    }

    // Signature area
    yPos = Math.max(yPos + 30, 180);
    doc.setFont('helvetica', 'bold');
    doc.text('Doctor\'s Signature', pageWidth - 60, yPos);
    doc.line(pageWidth - 80, yPos - 5, pageWidth - 20, yPos - 5);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    centerText('This certificate is valid for the mentioned period only.', 280, 8);

    // Download
    doc.save(`certificate_${currentPatient.uhid}_${new Date().toISOString().split('T')[0]}.pdf`);

    // Reset form and close modal
    setCertificateType('fitness');
    setCertificateFromDate(new Date().toISOString().split('T')[0]);
    setCertificateToDate(new Date().toISOString().split('T')[0]);
    setCertificateReason('');
    setCertificateRemarks('');
    setShowCertificateModal(false);
  };

  // Generate Referral Letter PDF
  const generateReferralPDF = () => {
    if (!currentPatient) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper function for centered text
    const centerText = (text: string, y: number, fontSize: number = 12) => {
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Header
    doc.setFont('helvetica', 'bold');
    centerText('LUMIS HEALTHCARE', 20, 18);
    doc.setFont('helvetica', 'normal');
    centerText('Referral Letter', 30, 14);

    // Date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 45);

    // Priority badge
    const priorityColors: Record<string, string> = {
      routine: '#16a34a',
      urgent: '#ea580c',
      emergency: '#dc2626',
    };
    doc.setTextColor(priorityColors[referralPriority] || '#000000');
    doc.setFont('helvetica', 'bold');
    doc.text(`Priority: ${referralPriority.toUpperCase()}`, pageWidth - 60, 45);
    doc.setTextColor('#000000');

    // Referral type
    const refTypeLabels: Record<string, string> = {
      specialist: 'Specialist Consultation Referral',
      hospital: 'Hospital Admission Referral',
      higher: 'Higher Centre Referral',
    };

    doc.setFont('helvetica', 'bold');
    centerText(refTypeLabels[referralType] || 'Patient Referral', 60, 14);

    // To section
    let yPos = 75;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('To:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(referTo || 'Concerned Specialist', 35, yPos);

    if (referralSpecialty) {
      yPos += 7;
      doc.text(`Department: ${referralSpecialty}`, 35, yPos);
    }

    // Patient details
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Details:', 20, yPos);
    doc.setFont('helvetica', 'normal');

    const patientName = `${currentPatient.firstName} ${currentPatient.lastName}`;
    const patientAge = currentPatient.dateOfBirth ? calculateAge(currentPatient.dateOfBirth) : 'N/A';
    const patientGender = currentPatient.gender || 'N/A';
    const uhid = currentPatient.uhid || 'N/A';

    yPos += 7;
    doc.text(`Name: ${patientName}`, 25, yPos);
    yPos += 6;
    doc.text(`Age/Gender: ${patientAge} years / ${patientGender}`, 25, yPos);
    yPos += 6;
    doc.text(`UHID: ${uhid}`, 25, yPos);

    // Reason for referral
    if (referralReason) {
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Reason for Referral:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 7;
      const splitReason = doc.splitTextToSize(referralReason, pageWidth - 40);
      doc.text(splitReason, 20, yPos);
      yPos += (splitReason.length * 6);
    }

    // Clinical summary
    if (referralSummary) {
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Clinical Summary:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 7;
      const splitSummary = doc.splitTextToSize(referralSummary, pageWidth - 40);
      doc.text(splitSummary, 20, yPos);
      yPos += (splitSummary.length * 6);
    }

    // Closing
    yPos = Math.max(yPos + 20, 180);
    doc.setFont('helvetica', 'normal');
    doc.text('Kindly evaluate and advise accordingly.', 20, yPos);
    yPos += 7;
    doc.text('Thank you.', 20, yPos);

    // Signature area
    yPos += 25;
    doc.setFont('helvetica', 'bold');
    doc.text('Referring Doctor', pageWidth - 60, yPos);
    doc.line(pageWidth - 80, yPos - 5, pageWidth - 20, yPos - 5);

    // Download
    doc.save(`referral_${currentPatient.uhid}_${new Date().toISOString().split('T')[0]}.pdf`);

    // Reset form and close modal
    setReferralType('specialist');
    setReferTo('');
    setReferralSpecialty('');
    setReferralReason('');
    setReferralPriority('routine');
    setReferralSummary('');
    setShowReferralModal(false);
  };

  // Save edits to a completed consultation
  const handleSaveEdits = async () => {
    if (!currentVisit?.opdVisit?.id || !currentPatient) return;

    setIsSavingEdits(true);
    try {
      const visitId = currentVisit.opdVisit.id;
      const patientId = currentPatient.id;

      // Update advice fields (these can be directly updated)
      await consultationService.updateVisitAdvice(visitId, {
        generalAdvice: adviceData.generalAdvice,
        dietaryAdvice: adviceData.dietaryAdvice,
        activityAdvice: adviceData.activityAdvice,
        followUpPlan: diagnosisData.followUp,
      });

      // For clinical history, notes, diagnoses, and prescriptions:
      // We need to either update existing records or create new ones
      // For simplicity, we'll create new records for any filled data
      // (In a production app, you'd want proper update/delete APIs)

      // Save clinical notes (chief complaint as history, examination as note)
      if (notesData.chiefComplaint) {
        await consultationService.createHistory({
          opdVisitId: visitId,
          historyType: 'CHIEF_COMPLAINT',
          description: notesData.chiefComplaint,
        });
      }
      if (notesData.examination) {
        await consultationService.createNote({
          visitId,
          patientId,
          noteType: 'EXAMINATION',
          content: notesData.examination,
        });
      }

      // Save clinical history entries
      const historyTypes = [
        { key: 'presentIllness', type: 'PRESENT_ILLNESS' },
        { key: 'pastMedical', type: 'PAST_MEDICAL' },
        { key: 'family', type: 'FAMILY' },
        { key: 'allergies', type: 'ALLERGY' },
        { key: 'addiction', type: 'ADDICTION' },
      ] as const;

      for (const { key, type } of historyTypes) {
        const value = historyData[key as keyof HistoryData];
        if (value && value.trim()) {
          await consultationService.createHistory({
            opdVisitId: visitId,
            historyType: type,
            description: value,
          });
        }
      }

      // Save assessment and follow-up as clinical notes
      if (diagnosisData.assessment) {
        await consultationService.createNote({
          visitId,
          patientId,
          noteType: 'ASSESSMENT',
          content: diagnosisData.assessment,
        });
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['todayQueue'] });
      await queryClient.invalidateQueries({ queryKey: ['patientHistory'] });

      // Trigger a reload of the consultation data to show the saved values
      setDataRefreshTrigger(prev => prev + 1);

      setIsSavingEdits(false);
      setIsEditMode(false);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving edits:', error);
      setIsSavingEdits(false);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Handle closing PDF modal and moving to next patient
  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    // Remove patient from queue by moving to next patient
    setTimeout(() => {
      nextPatient();
    }, 300);
  };

  if (!currentVisit || !currentPatient) {
    return null;
  }

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

  const tabs = [
    { id: 'notes', label: 'Clinical Notes', icon: FileText, color: 'emerald' },
    { id: 'history', label: 'History', icon: HistoryIcon, color: 'blue' },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope, color: 'purple' },
    { id: 'prescription', label: 'Prescription', icon: Pill, color: 'orange' },
    { id: 'advice', label: 'Advice', icon: Activity, color: 'cyan' },
  ];

  const isFirstPatient = selectedQueueIndex === 0;
  const isLastPatient = selectedQueueIndex === todayQueue.length - 1;

  return (
    <div className="space-y-3">
      {/* Patient Header */}
      <Card className="bg-emerald-50 border border-emerald-200">
        <div className="space-y-2">
          {/* Top Row: Patient Info + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-emerald-600 p-2.5 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {currentPatient.firstName} {currentPatient.lastName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-700 mt-0.5">
                  <span>
                    <strong className="text-emerald-700">UHID:</strong> {currentPatient.uhid}
                  </span>
                  <span>
                    <strong className="text-emerald-700">Age:</strong> {calculateAge(currentPatient.dateOfBirth)} years
                  </span>
                  <span>
                    <strong className="text-emerald-700">Gender:</strong> {currentPatient.gender}
                  </span>
                  <span>
                    <strong className="text-emerald-700">Phone:</strong> {currentPatient.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(currentVisit.appointmentDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviousRecords(true)}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs px-2 py-1"
              >
                <HistoryIcon className="w-3 h-3 mr-1" />
                Records
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['todayQueue'] })}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-2 py-1"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>

              {currentVisit.opdVisit?.visitStatus === 'IN_PROGRESS' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleCompleteConsultation}
                  isLoading={isCompleting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 py-1"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              )}

              {currentVisit.opdVisit?.visitStatus === 'COMPLETED' && !isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 text-xs px-2 py-1"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}

              {currentVisit.opdVisit?.visitStatus === 'COMPLETED' && isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="border-gray-400 text-gray-600 hover:bg-gray-50 text-xs px-2 py-1"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSaveEdits}
                    isLoading={isSavingEdits}
                    className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row: Patient Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPatient}
                disabled={isFirstPatient}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 text-xs px-1.5 sm:px-2 py-1"
              >
                <ChevronLeft className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <span className="text-xs text-gray-600 font-medium px-2">
                {selectedQueueIndex + 1} of {todayQueue.length}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={nextPatient}
                disabled={isLastPatient}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 text-xs px-1.5 sm:px-2 py-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3 h-3 sm:ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="border-slate-600 text-slate-700 hover:bg-slate-50 text-xs px-1.5 sm:px-2 py-1"
              >
                <Printer className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Print Rx</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCertificateModal(true)}
                className="border-purple-400 text-purple-600 hover:bg-purple-50 text-xs px-1.5 sm:px-2 py-1"
              >
                <Award className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Certificate</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReferralModal(true)}
                className="border-indigo-400 text-indigo-600 hover:bg-indigo-50 text-xs px-1.5 sm:px-2 py-1"
              >
                <ExternalLink className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Referral</span>
              </Button>
              {currentVisit.opdVisit?.visitStatus !== 'IN_PROGRESS' && currentVisit.opdVisit?.visitStatus !== 'COMPLETED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartConsultation}
                  isLoading={updateStatusMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 py-1"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
            </div>

            {currentVisit.opdVisit?.visitStatus === 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={generateConsultationPDF}
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs px-2 py-1"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content with Sidebar Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3">
        {/* Left: Consultation Forms (8 columns on desktop, full width on mobile) */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          {/* Edit Mode / View Mode Banner */}
          {currentVisit.opdVisit?.visitStatus === 'COMPLETED' && (
            <div className={`mb-2 px-4 py-2 rounded-lg flex items-center gap-2 ${isEditMode
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-gray-50 border border-gray-200 text-gray-600'
              }`}>
              {isEditMode ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Mode - Make changes and click "Save Changes" when done</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">Viewing completed consultation. Click "Edit" to make changes.</span>
                </>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex items-center overflow-x-auto">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 shrink-0 ${isActive
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white border border-t-0 border-gray-200 p-5 min-h-130">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-100">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 text-sm">Loading consultation data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'notes' && (
                  <NotesSection
                    visitId={currentVisit.opdVisit?.id || ''}
                    initialData={notesData}
                    onSave={handleNotesChange}
                  />
                )}
                {activeTab === 'history' && (
                  <HistorySection
                    visitId={currentVisit.opdVisit?.id || ''}
                    initialData={historyData}
                    onSave={handleHistoryChange}
                  />
                )}
                {activeTab === 'diagnosis' && (
                  <DiagnosisSection
                    visitId={currentVisit.opdVisit?.id || ''}
                    initialDiagnoses={diagnosisData.diagnoses}
                    initialAssessment={diagnosisData.assessment}
                    initialFollowUp={diagnosisData.followUp}
                    onSave={handleDiagnosisChange}
                  />
                )}
                {activeTab === 'prescription' && (
                  <PrescriptionSection
                    visitId={currentVisit.opdVisit?.id || ''}
                    patientId={currentPatient?.id}
                    initialItems={prescriptionData}
                    assessment={diagnosisData.assessment}
                    followUp={diagnosisData.followUp}
                    generalAdvice={adviceData.generalAdvice}
                    dietaryAdvice={adviceData.dietaryAdvice}
                    activityAdvice={adviceData.activityAdvice}
                    onSave={handlePrescriptionChange}
                  />
                )}
                {activeTab === 'advice' && (
                  <AdviceSection
                    visitId={currentVisit.opdVisit?.id || ''}
                    initialData={adviceData}
                    onSave={handleAdviceChange}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Vitals Sidebar (4 columns) */}
        <div className="col-span-4 order-1 lg:order-2">
          <Card
            title="Vital Signs"
            className="sticky top-6 border border-emerald-200 bg-emerald-50"
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVitalsModal(true)}
                className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            }
          >
            <VitalsDisplay />
          </Card>
        </div>
      </div>

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-600" />
                Record Vitals
              </h3>
              <button
                onClick={() => setShowVitalsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <VitalsForm onSuccess={() => setShowVitalsModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Previous Records Modal */}
      {showPreviousRecords && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HistoryIcon className="w-6 h-6 text-blue-600" />
                {selectedRecordVisit ? 'Visit Details' : `Previous Records - ${currentPatient?.firstName} ${currentPatient?.lastName}`}
              </h3>
              <div className="flex items-center gap-2">
                {selectedRecordVisit && (
                  <button
                    onClick={() => setSelectedRecordVisit(null)}
                    className="text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 hover:bg-blue-50 rounded-lg text-sm font-medium"
                  >
                    ← Back to list
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPreviousRecords(false);
                    setSelectedRecordVisit(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingVisits ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : !selectedRecordVisit ? (
                // Visit List
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      📋 Showing all previous consultations for <strong>{currentPatient?.firstName} {currentPatient?.lastName}</strong> (UHID: {currentPatient?.uhid})
                    </p>
                  </div>
                  {patientVisits && patientVisits.length > 0 ? (
                    <div className="space-y-3">
                      {patientVisits.map((visit: any) => (
                        <div
                          key={visit.id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedRecordVisit(visit)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {new Date(visit.appointmentDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {visit.appointmentTime} • {visit.opdVisit?.visitStatus || visit.appointmentStatus}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {visit.opdVisit?.diagnoses && visit.opdVisit.diagnoses.length > 0 && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                                  {visit.opdVisit.diagnoses.length} Diagnosis
                                </span>
                              )}
                              {visit.opdVisit?.prescriptions && visit.opdVisit.prescriptions.length > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                  {visit.opdVisit.prescriptions.reduce((acc: number, p: any) => acc + (p.items?.length || 0), 0)} Medications
                                </span>
                              )}
                              <Eye className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>
                          {visit.opdVisit?.diagnoses && visit.opdVisit.diagnoses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Diagnosis:</span>{' '}
                                {visit.opdVisit.diagnoses.map((d: any) => d.diagnosisText).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-semibold">No previous records found</p>
                      <p className="text-sm">This appears to be the patient's first visit</p>
                    </div>
                  )}
                </>
              ) : (
                // Visit Details View
                <div className="space-y-6">
                  {/* Visit Header */}
                  <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(selectedRecordVisit.appointmentDate).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          Time: {selectedRecordVisit.appointmentTime} • Status: {selectedRecordVisit.opdVisit?.visitStatus || selectedRecordVisit.appointmentStatus}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedRecordVisit.opdVisit?.visitStatus === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {selectedRecordVisit.opdVisit?.visitStatus || selectedRecordVisit.appointmentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Vitals */}
                  {selectedRecordVisit.opdVisit?.vitals && selectedRecordVisit.opdVisit.vitals.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-red-500" />
                        Vitals
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedRecordVisit.opdVisit.vitals[0]?.details?.map((vital: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase">{vital.vitalName}</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {vital.vitalValue} <span className="text-sm font-normal text-gray-500">{vital.unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chief Complaint & History */}
                  {selectedRecordVisit.opdVisit?.histories && selectedRecordVisit.opdVisit.histories.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Clinical History
                      </h4>
                      <div className="space-y-3">
                        {selectedRecordVisit.opdVisit.histories.map((history: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                              {history.historyType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-gray-900">{history.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical Notes */}
                  {selectedRecordVisit.opdVisit?.notes && selectedRecordVisit.opdVisit.notes.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-purple-500" />
                        Clinical Notes
                      </h4>
                      <div className="space-y-3">
                        {selectedRecordVisit.opdVisit.notes.map((note: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">{note.noteType}</p>
                            <p className="text-gray-900">{note.noteText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis */}
                  {selectedRecordVisit.opdVisit?.diagnoses && selectedRecordVisit.opdVisit.diagnoses.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        Diagnosis
                      </h4>
                      <div className="space-y-2">
                        {selectedRecordVisit.opdVisit.diagnoses.map((diagnosis: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${diagnosis.diagnosisType === 'FINAL' ? 'bg-green-100 text-green-700' :
                              diagnosis.diagnosisType === 'PROVISIONAL' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {diagnosis.diagnosisType}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{diagnosis.diagnosisText}</p>
                              {diagnosis.icdCode && (
                                <p className="text-xs text-gray-500">ICD: {diagnosis.icdCode}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prescriptions */}
                  {selectedRecordVisit.opdVisit?.prescriptions && selectedRecordVisit.opdVisit.prescriptions.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-500" />
                        Prescriptions
                      </h4>
                      <div className="space-y-2">
                        {selectedRecordVisit.opdVisit.prescriptions.flatMap((prescription: any) =>
                          prescription.items?.map((item: any, idx: number) => (
                            <div key={`${prescription.id}-${idx}`} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.drugName}</p>
                                <p className="text-sm text-gray-600">
                                  {item.dosage} • {item.frequency} • {item.durationDays} days
                                </p>
                                {item.instructions && (
                                  <p className="text-xs text-gray-500 mt-1">{item.instructions}</p>
                                )}
                              </div>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                {item.beforeAfterFood || 'After Food'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advice */}
                  {(selectedRecordVisit.opdVisit?.generalAdvice || selectedRecordVisit.opdVisit?.dietaryAdvice || selectedRecordVisit.opdVisit?.activityAdvice || selectedRecordVisit.opdVisit?.followUpPlan) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-500" />
                        Advice & Follow-up
                      </h4>
                      <div className="space-y-3">
                        {selectedRecordVisit.opdVisit.generalAdvice && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">General Advice</p>
                            <p className="text-gray-900">{selectedRecordVisit.opdVisit.generalAdvice}</p>
                          </div>
                        )}
                        {selectedRecordVisit.opdVisit.dietaryAdvice && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Dietary Advice</p>
                            <p className="text-gray-900">{selectedRecordVisit.opdVisit.dietaryAdvice}</p>
                          </div>
                        )}
                        {selectedRecordVisit.opdVisit.activityAdvice && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Activity Advice</p>
                            <p className="text-gray-900">{selectedRecordVisit.opdVisit.activityAdvice}</p>
                          </div>
                        )}
                        {selectedRecordVisit.opdVisit.followUpPlan && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Follow-up Plan</p>
                            <p className="text-gray-900">{selectedRecordVisit.opdVisit.followUpPlan}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Download Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                Consultation Completed
              </h3>
              <button
                onClick={handleClosePdfModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-8 space-y-3">
              <p className="text-gray-700">
                The consultation for <strong className="text-emerald-600">{currentPatient?.firstName} {currentPatient?.lastName}</strong> ({currentPatient?.uhid}) has been successfully completed.
              </p>
              <p className="text-gray-600 text-sm bg-gray-50 p-4 rounded-lg">
                💡 You can download the consultation report now or access it later from Patient History.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={generateConsultationPDF}
                isLoading={isDownloadingPdf}
                className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button
                variant="outline"
                onClick={handleClosePdfModal}
                disabled={isDownloadingPdf}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                Medical Certificate
              </h3>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-purple-900">
                  📋 Generate medical fitness or leave certificate for <strong>{currentPatient?.firstName} {currentPatient?.lastName}</strong>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Certificate Type
                  </label>
                  <select
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value as 'fitness' | 'leave' | 'sick')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="fitness">Medical Fitness Certificate</option>
                    <option value="leave">Medical Leave Certificate</option>
                    <option value="sick">Sick Leave Certificate</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={certificateFromDate}
                      onChange={(e) => setCertificateFromDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={certificateToDate}
                      onChange={(e) => setCertificateToDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reason / Diagnosis
                  </label>
                  <textarea
                    rows={3}
                    value={certificateReason}
                    onChange={(e) => setCertificateReason(e.target.value)}
                    placeholder="Enter the medical reason..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Additional Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={certificateRemarks}
                    onChange={(e) => setCertificateRemarks(e.target.value)}
                    placeholder="Any additional remarks..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="primary"
                  onClick={generateCertificatePDF}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCertificateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ExternalLink className="w-6 h-6 text-indigo-600" />
                Patient Referral
              </h3>
              <button
                onClick={() => setShowReferralModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-900">
                  📋 Refer <strong>{currentPatient?.firstName} {currentPatient?.lastName}</strong> to another specialist or hospital
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Referral Type
                  </label>
                  <select
                    value={referralType}
                    onChange={(e) => setReferralType(e.target.value as 'specialist' | 'hospital' | 'higher')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="specialist">Specialist Consultation</option>
                    <option value="hospital">Hospital Admission</option>
                    <option value="higher">Higher Centre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Refer To (Doctor/Hospital Name)
                  </label>
                  <input
                    type="text"
                    value={referTo}
                    onChange={(e) => setReferTo(e.target.value)}
                    placeholder="e.g., Dr. Smith - Cardiology"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Specialty / Department
                  </label>
                  <input
                    type="text"
                    value={referralSpecialty}
                    onChange={(e) => setReferralSpecialty(e.target.value)}
                    placeholder="e.g., Cardiology, Orthopedics"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reason for Referral
                  </label>
                  <textarea
                    rows={3}
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    placeholder="Briefly describe why you are referring this patient..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Priority
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value="routine"
                        checked={referralPriority === 'routine'}
                        onChange={() => setReferralPriority('routine')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Routine</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value="urgent"
                        checked={referralPriority === 'urgent'}
                        onChange={() => setReferralPriority('urgent')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Urgent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value="emergency"
                        checked={referralPriority === 'emergency'}
                        onChange={() => setReferralPriority('emergency')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Emergency</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Clinical Summary (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={referralSummary}
                    onChange={(e) => setReferralSummary(e.target.value)}
                    placeholder="Brief clinical summary for the referred doctor..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="primary"
                  onClick={generateReferralPDF}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Referral Letter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReferralModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Prescription Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Print Options</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Toggles */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Sections to Print</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'chiefComplaint', label: 'Chief Complaint' },
                  { key: 'vitals', label: 'Vitals' },
                  { key: 'prescription', label: 'Prescription' },
                  { key: 'assessment', label: 'Assessment' },
                  { key: 'advice', label: 'Advice' },
                  { key: 'followUp', label: 'Follow Up' },
                  { key: 'diagnosis', label: 'Diagnosis' },
                  { key: 'history', label: 'History' },
                ].map((section) => (
                  <label
                    key={section.key}
                    className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={printSections[section.key as keyof typeof printSections]}
                      onChange={(e) => setPrintSections(prev => ({ ...prev, [section.key]: e.target.checked }))}
                      className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                    />
                    <span className="text-sm text-gray-700">{section.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Print Language</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'Hindi (हिंदी)' },
                  { code: 'mr', label: 'Marathi (मराठी)' },
                  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' }
                ].map((lang) => (
                  <label
                    key={lang.code}
                    className={`flex items-center p-2 border rounded-lg cursor-pointer transition-all ${printLanguage === lang.code
                      ? 'border-slate-600 bg-slate-50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="printLanguage"
                      checked={printLanguage === lang.code}
                      onChange={() => setPrintLanguage(lang.code as 'en' | 'hi' | 'mr' | 'kn')}
                      className="w-4 h-4 text-slate-600 border-gray-300 focus:ring-slate-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{lang.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setIsPrinting(true);
                  setTimeout(() => {
                    window.print();
                    setIsPrinting(false);
                  }, 100);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Portal */}
      {isPrinting && createPortal(
        <div id="print-portal">
          <PrescriptionPrint
            items={printSections.prescription ? prescriptionData.map(item => ({
              id: item.id,
              drugName: item.drugName,
              dosage: item.dosage || '',
              frequency: item.frequency || '',
              timing: item.timing || '',
              durationDays: item.durationDays || 0,
            })) : []}
            assessment={printSections.assessment ? diagnosisData.assessment : undefined}
            followUp={printSections.followUp ? diagnosisData.followUp : undefined}
            printLanguage={printLanguage}
            generalAdvice={printSections.advice ? adviceData.generalAdvice : undefined}
            dietaryAdvice={printSections.advice ? adviceData.dietaryAdvice : undefined}
            activityAdvice={printSections.advice ? adviceData.activityAdvice : undefined}
            chiefComplaint={printSections.chiefComplaint ? notesData.chiefComplaint : undefined}
            vitals={printSections.vitals ? getPrintVitals() : undefined}
            doctorInfo={getDoctorInfo()}
            showSections={printSections}
            diagnoses={printSections.diagnosis ? diagnosisData.diagnoses : undefined}
            history={printSections.history ? historyData : undefined}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
