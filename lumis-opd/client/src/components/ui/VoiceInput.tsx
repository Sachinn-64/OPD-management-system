import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  onVoiceStart,
  onVoiceStop,
  placeholder = 'Type or click mic to speak...',
  className = '',
  disabled = false,
}) => {
  const {
    isListening,
    isSupported,
    interimTranscript,
    error,
    toggleListening,
    resetTranscript,
  } = useVoiceRecognition({
    language: 'en-IN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      console.log('✅ VoiceInput received:', { text, isFinal, currentValue: value });
      if (isFinal && text.trim()) {
        const newValue = value ? `${value} ${text}` : text;
        console.log('✅ Updating input value to:', newValue);
        onChange(newValue);
      }
    },
    onError: (err) => {
      console.error('❌ Voice recognition error:', err);
      if (err.includes('not-allowed')) {
        alert('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (err.includes('no-speech')) {
        // This is not really an error, just no speech detected
        console.log('No speech detected, waiting...');
      } else {
        alert(`Voice input error: ${err}`);
      }
    },
  });

  const handleMicClick = async () => {
    console.log('🎤 Mic button clicked, isSupported:', isSupported, 'isListening:', isListening);
    
    if (!isSupported) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      console.log('✅ Microphone permission granted');
    } catch (err) {
      console.error('❌ Microphone permission error:', err);
      alert('Please allow microphone access to use voice input.');
      return;
    }

    if (isListening) {
      console.log('🛑 Stopping voice recognition');
      toggleListening();
      onVoiceStop?.();
    } else {
      console.log('▶️ Starting voice recognition');
      resetTranscript();
      toggleListening();
      onVoiceStart?.();
    }
  };

  const displayValue = isListening && interimTranscript
    ? `${value} ${interimTranscript}`.trim()
    : value;

  return (
    <div className={`relative ${className}`}>
      <textarea
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none ${
          isListening ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
        }`}
        rows={4}
      />
      
      <button
        type="button"
        onClick={handleMicClick}
        disabled={disabled}
        className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-emerald-600 text-white animate-pulse'
            : isSupported
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={
          !isSupported
            ? 'Voice input not supported in this browser'
            : isListening
            ? 'Click to stop recording'
            : 'Click to start voice input (Chrome/Edge only)'
        }
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {isListening && (
        <div className="absolute bottom-2 left-3 flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
          Listening... Speak now
        </div>
      )}

      {error && !error.includes('no-speech') && (
        <div className="absolute bottom-2 left-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!isSupported && (
        <div className="absolute bottom-2 left-3 text-xs text-gray-500">
          Voice input requires Chrome or Edge browser
        </div>
      )}
    </div>
  );
};
