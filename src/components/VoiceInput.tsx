import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true; // We can use interim, but for appending, it's better to only append final results to avoid duplicates.
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            onTranscript(finalTranscript);
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied');
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setError('Speech recognition not supported in this browser.');
      }
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setError('');
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  }, [isListening, recognition]);

  if (!recognition && !error) {
    return null;
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <button
        type="button"
        onClick={toggleListening}
        className={cn(
          "p-2 rounded-full transition-all duration-200 flex items-center justify-center",
          isListening 
            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse shadow-sm" 
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
          error && "opacity-50 cursor-not-allowed"
        )}
        title={error || (isListening ? "Stop listening" : "Start voice input")}
        disabled={!!error && !isListening}
      >
        <Mic className="w-5 h-5" />
      </button>
      {isListening && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10">
          Listening...
        </span>
      )}
    </div>
  );
}
