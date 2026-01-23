/* global SpeechRecognition, SpeechRecognitionEvent */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface HistoryData {
  presentIllness: string;
  pastMedical: string;
  family: string;
  allergies: string;
  addiction: string;
}

interface HistorySectionProps {
  visitId: string;
  initialData?: {
    presentIllness?: string;
    pastMedical?: string;
    family?: string;
    allergies?: string;
    addiction?: string;
  };
  onSave?: (data: HistoryData) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({ visitId: _visitId, initialData, onSave }) => {
  const [formData, setFormData] = useState({
    presentIllness: initialData?.presentIllness || '',
    pastMedical: initialData?.pastMedical || '',
    family: initialData?.family || '',
    allergies: initialData?.allergies || '',
    addiction: initialData?.addiction || '',
  });

  // Sync form data when initialData changes (e.g., when loading completed visit data)
  useEffect(() => {
    setFormData({
      presentIllness: initialData?.presentIllness || '',
      pastMedical: initialData?.pastMedical || '',
      family: initialData?.family || '',
      allergies: initialData?.allergies || '',
      addiction: initialData?.addiction || '',
    });
  }, [initialData?.presentIllness, initialData?.pastMedical, initialData?.family, initialData?.allergies, initialData?.addiction]);

  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef<string>('');
  const accumulatedFinalRef = useRef<string>('');

  const handleChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSave?.(updated);
  };

  const toggleVoiceInput = (field: string) => {
    // If already listening to this field, stop
    if (isListening && activeVoice === field) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setActiveVoice(null);
      // Commit the final accumulated text
      const finalValue = baseTextRef.current + (baseTextRef.current.trim() && accumulatedFinalRef.current ? ' ' : '') + accumulatedFinalRef.current;
      if (accumulatedFinalRef.current) {
        handleChange(field, finalValue.trim());
      }
      baseTextRef.current = '';
      accumulatedFinalRef.current = '';
      return;
    }

    // If listening to another field, stop that first
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
    baseTextRef.current = formData[field as keyof typeof formData];
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
      const separator = baseTextRef.current.trim() ? ' ' : '';
      const displayValue = baseTextRef.current +
        (accumulatedFinalRef.current ? separator + accumulatedFinalRef.current : '') +
        (interimTranscript ? ' ' + interimTranscript : '');

      // Update form for real-time display
      const updated = { ...formData, [field]: displayValue };
      setFormData(updated);
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
      const finalValue = baseTextRef.current + (baseTextRef.current.trim() && accumulatedFinalRef.current ? ' ' : '') + accumulatedFinalRef.current;
      if (accumulatedFinalRef.current) {
        handleChange(field, finalValue.trim());
      }
      baseTextRef.current = '';
      accumulatedFinalRef.current = '';
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const historyFields = [
    { key: 'presentIllness', label: 'Present Illness', placeholder: 'Describe the current illness, symptoms, onset, duration...' },
    { key: 'pastMedical', label: 'Past Medical History', placeholder: 'Previous illnesses, surgeries, chronic conditions...' },
    { key: 'family', label: 'Family History', placeholder: 'Hereditary conditions, family medical history...' },
    { key: 'allergies', label: 'Allergies', placeholder: 'Drug allergies, food allergies, environmental allergies...' },
    { key: 'addiction', label: 'Addiction History', placeholder: 'Tobacco, alcohol, substance use history, duration, quantity...' },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
        <p className="text-xs text-emerald-800">
          💡 All data will be saved when you click 'Complete Consultation' button
        </p>
      </div>

      {historyFields.map((field) => (
        <div key={field.key}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-900">
              {field.label}
            </label>
            <button
              type="button"
              onClick={() => toggleVoiceInput(field.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${activeVoice === field.key && isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {activeVoice === field.key && isListening ? (
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
            value={formData[field.key as keyof typeof formData]}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-sm"
          />
        </div>
      ))}
    </div>
  );
};
