/* global SpeechRecognition, SpeechRecognitionEvent */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface AdviceSectionProps {
  visitId: string;
  initialData?: {
    generalAdvice?: string;
    dietaryAdvice?: string;
    activityAdvice?: string;
  };
  onSave?: (data: { generalAdvice: string; dietaryAdvice: string; activityAdvice: string }) => void;
}

export const AdviceSection: React.FC<AdviceSectionProps> = ({ visitId: _visitId, initialData, onSave }) => {
  const [formData, setFormData] = useState({
    generalAdvice: initialData?.generalAdvice || '',
    dietaryAdvice: initialData?.dietaryAdvice || '',
    activityAdvice: initialData?.activityAdvice || '',
  });

  // Sync form data when initialData changes (e.g., when loading completed visit data)
  useEffect(() => {
    setFormData({
      generalAdvice: initialData?.generalAdvice || '',
      dietaryAdvice: initialData?.dietaryAdvice || '',
      activityAdvice: initialData?.activityAdvice || '',
    });
  }, [initialData?.generalAdvice, initialData?.dietaryAdvice, initialData?.activityAdvice]);

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
    // Check if we are in browser environment
    if (typeof window === 'undefined') return;

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

  const adviceFields = [
    { key: 'generalAdvice', label: 'General Advice', placeholder: 'General lifestyle recommendations, precautions, warning signs...' },
    { key: 'dietaryAdvice', label: 'Dietary Advice', placeholder: 'Dietary recommendations, foods to avoid, meal timing...' },
    { key: 'activityAdvice', label: 'Activity & Lifestyle', placeholder: 'Exercise recommendations, activity restrictions, lifestyle modifications...' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-sm text-emerald-800">
          💡 All advice will be saved when you click 'Complete Consultation' button
        </p>
      </div>

      {adviceFields.map((field) => (
        <div key={field.key}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-semibold text-gray-900">
              {field.label}
            </label>
            <button
              type="button"
              onClick={() => toggleVoiceInput(field.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${activeVoice === field.key && isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {activeVoice === field.key && isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Voice
                </>
              )}
            </button>
          </div>
          <textarea
            value={formData[field.key as keyof typeof formData]}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-base"
          />
        </div>
      ))}
    </div>
  );
};
