import { useEffect, useRef, useState, useCallback } from 'react';
import { VOICE_LANGUAGES } from '../config/constants';

/* global SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent */

interface UseVoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export const useVoiceRecognition = (options: UseVoiceRecognitionOptions = {}) => {
  const {
    language = VOICE_LANGUAGES.ENGLISH_IN,
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Initialize recognition once
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      
      // Configure recognition
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      console.log('Speech recognition initialized:', { language, continuous, interimResults });

      // Handle results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('onresult fired, results length:', event.results.length);
        
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          console.log(`Result ${i}:`, transcriptPart, 'isFinal:', event.results[i].isFinal);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + ' ';
          } else {
            interim += transcriptPart;
          }
        }

        console.log('Final:', finalTranscript, 'Interim:', interim);

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
          onResultRef.current?.(finalTranscript.trim(), true);
        }

        setInterimTranscript(interim);
        if (interim && interimResults) {
          onResultRef.current?.(interim, false);
        }
      };

      // Handle errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        const errorMessage = `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        setIsListening(false);
      };

      // Handle start
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      // Handle end
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech recognition not supported');
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
    };
  }, [language, continuous, interimResults]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      console.error('Cannot start: not supported or no recognition instance');
      setError('Speech recognition not supported');
      return;
    }

    try {
      console.log('Starting speech recognition...');
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
    } catch (err) {
      const error = err as Error;
      console.error('Error starting recognition:', error);
      setError(error.message);
      onErrorRef.current?.(error.message);
    }
  }, [isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
};
