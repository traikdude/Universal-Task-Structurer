import React, { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink, RefreshCw, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

export type SendStatus = 'idle' | 'sending' | 'success' | 'error';

interface SendConfirmationModalProps {
  status: SendStatus;
  taskCount: number;
  listName: string;
  errorMessage?: string;
  onRetry: () => void;
  onClose: () => void;
}

function fireSuccessConfetti() {
  const duration = 3500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 70, zIndex: 200 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
    const particleCount = 60 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
      colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
      colors: ['#3b82f6', '#2563eb', '#93c5fd', '#60a5fa', '#dbeafe'],
    });
  }, 250);
}

export function SendConfirmationModal({
  status,
  taskCount,
  listName,
  errorMessage,
  onRetry,
  onClose,
}: SendConfirmationModalProps) {
  const hasShownConfetti = useRef(false);

  // Fire confetti exactly once when we enter success state
  useEffect(() => {
    if (status === 'success' && !hasShownConfetti.current) {
      hasShownConfetti.current = true;
      fireSuccessConfetti();
    }
    if (status !== 'success') {
      hasShownConfetti.current = false;
    }
  }, [status]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'sending') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, onClose]);

  if (status === 'idle') return null;

  const taskWord = taskCount === 1 ? 'task' : 'tasks';

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'sending') onClose();
      }}
    >
      {/* Modal card */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300',
          'bg-white dark:bg-gray-900 border',
          status === 'success' ? 'border-green-200 dark:border-green-800' :
          status === 'error'   ? 'border-red-200 dark:border-red-800' :
                                 'border-gray-200 dark:border-gray-700'
        )}
      >
        {/* Dismiss button — hidden while sending */}
        {status !== 'sending' && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── SENDING STATE ── */}
        {status === 'sending' && (
          <div className="flex flex-col items-center justify-center px-8 py-12 gap-5 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Sending to Google Tasks…
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Transferring {taskCount} {taskWord} to <span className="font-medium text-gray-700 dark:text-gray-300">"{listName}"</span>.<br />
                Please don't close this window.
              </p>
            </div>
            {/* Animated progress dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {status === 'success' && (
          <div className="flex flex-col items-center px-8 py-10 gap-5 text-center">
            {/* Animated success ring */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <CheckCircle className="w-14 h-14 text-green-500" strokeWidth={1.5} />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🎉 Successfully Sent!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Your {taskCount} {taskWord} {taskCount === 1 ? 'was' : 'were'} successfully transferred to{' '}
                <span className="font-semibold text-green-700 dark:text-green-400">
                  "{listName}"
                </span>{' '}
                in Google Tasks.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <a
                href="https://tasks.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Tasks
              </a>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {status === 'error' && (
          <div className="flex flex-col items-center px-8 py-10 gap-5 text-center">
            <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-14 h-14 text-red-500" strokeWidth={1.5} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Unable to Send
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                {errorMessage || 'The notes could not be sent to Google Tasks. Please check your connection and try again.'}
              </p>

              {/* Common causes hint */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 text-left text-xs text-red-700 dark:text-red-300 space-y-1">
                <p className="font-semibold mb-1">Common causes:</p>
                <p>• 🔌 No internet connection</p>
                <p>• 🔑 Google session expired — try signing out and back in</p>
                <p>• ⏳ Google Tasks is temporarily unavailable</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
