import { useState, useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isHostnameLocal = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
      setIsLocal(isHostnameLocal);

      // Only initialize native speech recognition if we are on localhost
      if (isHostnameLocal) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
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
    }
  }, [onTranscript]);

  // Listen for messages from the popup helper window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SPEECH_RESULT') {
        const transcript = event.data.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTranscript]);

  const handleMicClick = useCallback(() => {
    if (isLocal) {
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
    } else {
      // Deployed web app (sandboxed iframe) -> Open the popup voice.html helper page
      const helperUrl = import.meta.env.VITE_VOICE_HELPER_URL || 'https://raw.githack.com/traikdude/Universal-Task-Structurer/main/public/voice.html';
      const width = 450;
      const height = 400;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        helperUrl,
        'VoiceDictationHelper',
        `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        setError('Popup blocked! Please allow popups for this page to use voice input.');
        setTimeout(() => setError(''), 5000);
      }
    }
  }, [isLocal, isListening, recognition]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <button
        type="button"
        onClick={handleMicClick}
        className={cn(
          "p-2 rounded-full transition-all duration-200 flex items-center justify-center",
          isListening 
            ? "bg-red-100 text-red-650 dark:bg-red-900/30 dark:text-red-400 animate-pulse shadow-sm" 
            : "bg-gray-150 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
          error && "opacity-50 cursor-not-allowed"
        )}
        title={error || (isListening ? "Stop listening" : "Start voice input")}
        disabled={!!error && !isListening && isLocal}
      >
        <Mic className="w-5 h-5" />
      </button>
      {isListening && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 dark:bg-gray-105 text-white dark:text-gray-900 text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10">
          Listening...
        </span>
      )}
      {error && !isLocal && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10">
          {error}
        </span>
      )}
    </div>
  );
}