/* global SpeechRecognition, SpeechRecognitionEvent */
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, Mic, MicOff } from 'lucide-react';

interface Diagnosis {
  id: string;
  type: 'PROVISIONAL' | 'FINAL' | 'DIFFERENTIAL';
  icdCode?: string;
  diagnosisText: string;
}

interface DiagnosisSectionProps {
  visitId: string;
  initialDiagnoses?: Diagnosis[];
  initialAssessment?: string;
  initialFollowUp?: string;
  onSave?: (data: { diagnoses: Diagnosis[]; assessment: string; followUp: string }) => void;
}

export const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({
  visitId: _visitId,
  initialDiagnoses,
  initialAssessment,
  initialFollowUp,
  onSave
}) => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(
    initialDiagnoses || [{ id: Date.now().toString(), type: 'FINAL', icdCode: '', diagnosisText: '' }]
  );
  const [assessment, setAssessment] = useState(initialAssessment || '');
  const [followUp, setFollowUp] = useState(initialFollowUp || '');
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Sync form data when initialData changes (e.g., when loading completed visit data)
  useEffect(() => {
    if (initialDiagnoses && initialDiagnoses.length > 0) {
      setDiagnoses(initialDiagnoses);
    } else {
      setDiagnoses([{ id: Date.now().toString(), type: 'FINAL', icdCode: '', diagnosisText: '' }]);
    }
    setAssessment(initialAssessment || '');
    setFollowUp(initialFollowUp || '');
  }, [initialDiagnoses, initialAssessment, initialFollowUp]);

  const saveAll = (newDiagnoses: Diagnosis[], newAssessment: string, newFollowUp: string) => {
    onSave?.({ diagnoses: newDiagnoses, assessment: newAssessment, followUp: newFollowUp });
  };

  const addDiagnosis = () => {
    const newDiagnosis: Diagnosis = {
      id: Date.now().toString(),
      type: 'FINAL',
      icdCode: '',
      diagnosisText: '',
    };
    const updated = [...diagnoses, newDiagnosis];
    setDiagnoses(updated);
    saveAll(updated, assessment, followUp);
  };

  const removeDiagnosis = (id: string) => {
    const updated = diagnoses.filter((d) => d.id !== id);
    setDiagnoses(updated);
    saveAll(updated, assessment, followUp);
  };

  const updateDiagnosis = (id: string, field: keyof Diagnosis, value: any) => {
    const updated = diagnoses.map((d) => (d.id === id ? { ...d, [field]: value } : d));
    setDiagnoses(updated);
    saveAll(updated, assessment, followUp);
  };

  const updateAssessment = (value: string) => {
    setAssessment(value);
    saveAll(diagnoses, value, followUp);
  };

  const updateFollowUp = (value: string) => {
    setFollowUp(value);
    saveAll(diagnoses, assessment, value);
  };

  const baseTextRef = useRef<{ assessment: string; followUp: string }>({ assessment: '', followUp: '' });
  const accumulatedFinalRef = useRef<string>('');

  const toggleVoiceInput = (field: string) => {
    if (isListening && activeVoice === field) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setActiveVoice(null);
      // Commit the final accumulated text
      if (accumulatedFinalRef.current) {
        if (field === 'assessment') {
          const separator = baseTextRef.current.assessment.trim() ? ' ' : '';
          updateAssessment((baseTextRef.current.assessment + separator + accumulatedFinalRef.current).trim());
        } else if (field === 'followUp') {
          const separator = baseTextRef.current.followUp.trim() ? ' ' : '';
          updateFollowUp((baseTextRef.current.followUp + separator + accumulatedFinalRef.current).trim());
        }
      }
      accumulatedFinalRef.current = '';
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice input is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Store the current text as base
    baseTextRef.current = { assessment, followUp };
    accumulatedFinalRef.current = '';

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setActiveVoice(field);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Accumulate final transcripts
      if (finalTranscript) {
        accumulatedFinalRef.current += (accumulatedFinalRef.current ? ' ' : '') + finalTranscript.trim();
      }

      // Build display value: base + accumulated finals + current interim
      if (field === 'assessment') {
        const separator = baseTextRef.current.assessment.trim() ? ' ' : '';
        const displayValue = baseTextRef.current.assessment +
          (accumulatedFinalRef.current ? separator + accumulatedFinalRef.current : '') +
          (interimTranscript ? ' ' + interimTranscript : '');
        setAssessment(displayValue);
      } else if (field === 'followUp') {
        const separator = baseTextRef.current.followUp.trim() ? ' ' : '';
        const displayValue = baseTextRef.current.followUp +
          (accumulatedFinalRef.current ? separator + accumulatedFinalRef.current : '') +
          (interimTranscript ? ' ' + interimTranscript : '');
        setFollowUp(displayValue);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setActiveVoice(null);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveVoice(null);
      // Commit final value on natural end
      if (accumulatedFinalRef.current) {
        if (field === 'assessment') {
          const separator = baseTextRef.current.assessment.trim() ? ' ' : '';
          updateAssessment((baseTextRef.current.assessment + separator + accumulatedFinalRef.current).trim());
        } else if (field === 'followUp') {
          const separator = baseTextRef.current.followUp.trim() ? ' ' : '';
          updateFollowUp((baseTextRef.current.followUp + separator + accumulatedFinalRef.current).trim());
        }
      }
      accumulatedFinalRef.current = '';
      recognitionRef.current = null;
    };

    recognition.start();
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-sm text-emerald-800">
          🩺 All diagnoses will be saved when you click 'Complete Consultation' button
        </p>
      </div>

      <div className="space-y-4">
        {diagnoses.map((diagnosis, index) => (
          <div
            key={diagnosis.id}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-bold text-gray-900">Diagnosis {index + 1}</h4>
              {diagnoses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDiagnosis(diagnosis.id)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Type
                </label>
                <select
                  value={diagnosis.type}
                  onChange={(e) => updateDiagnosis(diagnosis.id, 'type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="PROVISIONAL">Provisional</option>
                  <option value="FINAL">Final</option>
                  <option value="DIFFERENTIAL">Differential</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  ICD-10 Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={diagnosis.icdCode || ''}
                    onChange={(e) => updateDiagnosis(diagnosis.id, 'icdCode', e.target.value)}
                    placeholder="e.g., J06.9"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">
                Diagnosis Description
              </label>
              <textarea
                value={diagnosis.diagnosisText}
                onChange={(e) => updateDiagnosis(diagnosis.id, 'diagnosisText', e.target.value)}
                placeholder="Enter detailed diagnosis description..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Diagnosis Button */}
      <button
        type="button"
        onClick={addDiagnosis}
        className="group w-full relative overflow-hidden flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-base font-semibold hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <div className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
          <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-white/20 transition-colors duration-300">
            <Plus className="w-5 h-5" />
          </div>
          <span>Add New Diagnosis</span>
        </div>
      </button>

      {/* Assessment & Plan */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-base font-semibold text-gray-900">
            Assessment & Plan
          </label>
          <button
            type="button"
            onClick={() => toggleVoiceInput('assessment')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${activeVoice === 'assessment' && isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {activeVoice === 'assessment' && isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                Recording
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Voice
              </>
            )}
          </button>
        </div>
        <textarea
          value={assessment}
          onChange={(e) => updateAssessment(e.target.value)}
          placeholder="Clinical assessment, treatment plan, recommendations..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>

      {/* Follow-up Plan */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-base font-semibold text-gray-900">
            Follow-up Plan
          </label>
          <button
            type="button"
            onClick={() => toggleVoiceInput('followUp')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${activeVoice === 'followUp' && isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {activeVoice === 'followUp' && isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                Recording
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Voice
              </>
            )}
          </button>
        </div>
        <textarea
          value={followUp}
          onChange={(e) => updateFollowUp(e.target.value)}
          placeholder="Follow-up schedule, review date, instructions..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>
    </div>
  );
};
