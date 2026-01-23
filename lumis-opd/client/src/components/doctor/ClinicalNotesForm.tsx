import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// UI: clinical notes form (no inner tabs)
import { useConsultationStore } from '../../store/consultationStore';
import { consultationService } from '../../services/consultationService';
import { VoiceInput } from '../ui/VoiceInput';

export const ClinicalNotesForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentVisit, currentPatient } = useConsultationStore();

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [assessmentPlan, setAssessmentPlan] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState('');

  // Fetch existing notes
  const { data: existingNotes } = useQuery({
    queryKey: ['clinicalNotes', currentVisit?.opdVisit?.id],
    queryFn: () => consultationService.getNotesByVisit(currentVisit!.opdVisit!.id),
    enabled: !!currentVisit?.opdVisit?.id,
  });

  // Load existing notes
  useEffect(() => {
    if (existingNotes && existingNotes.length > 0) {
      existingNotes.forEach((note) => {
        switch (note.noteType) {
          case 'CHIEF_COMPLAINT':
            setChiefComplaint(note.content);
            break;
          case 'EXAMINATION':
            setExaminationFindings(note.content);
            break;
          case 'ASSESSMENT_PLAN':
            setAssessmentPlan(note.content);
            break;
          case 'FOLLOW_UP':
            setFollowUpPlan(note.content);
            break;
        }
      });
    }
  }, [existingNotes]);

  // Save note mutation
  const saveMutation = useMutation({
    mutationFn: consultationService.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicalNotes', currentVisit?.opdVisit?.id] });
    },
  });

  // Auto-save on blur
  const handleSaveNote = (noteType: string, content: string) => {
    if (!currentVisit?.opdVisit?.id || !currentPatient || !content.trim()) return;

    saveMutation.mutate({
      visitId: currentVisit.opdVisit.id,
      patientId: currentPatient.id,
      noteType,
      content: content.trim(),
      isVoiceRecorded: true,
    });
  };

  return (
    <div className="space-y-0">
      <div className="bg-white p-6">
        <div className="space-y-6">
          {/* Chief Complaint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">Chief Complaint</label>
            </div>
            <VoiceInput
              value={chiefComplaint}
              onChange={setChiefComplaint}
              placeholder="Enter chief complaint or use voice input..."
              onVoiceStop={() => handleSaveNote('CHIEF_COMPLAINT', chiefComplaint)}
            />
          </div>

          {/* Examination Findings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">Examination Findings</label>
            </div>
            <VoiceInput
              value={examinationFindings}
              onChange={setExaminationFindings}
              placeholder="Enter examination findings or use voice input..."
              onVoiceStop={() => handleSaveNote('EXAMINATION', examinationFindings)}
            />
          </div>

          {/* Assessment & Plan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">Assessment & Plan</label>
            </div>
            <VoiceInput
              value={assessmentPlan}
              onChange={setAssessmentPlan}
              placeholder="Enter assessment & plan or use voice input..."
              onVoiceStop={() => handleSaveNote('ASSESSMENT_PLAN', assessmentPlan)}
            />
          </div>

          {/* Follow-up Plan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">Follow-up Plan</label>
            </div>
            <VoiceInput
              value={followUpPlan}
              onChange={setFollowUpPlan}
              placeholder="Enter follow-up plan or use voice input..."
              onVoiceStop={() => handleSaveNote('FOLLOW_UP', followUpPlan)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
