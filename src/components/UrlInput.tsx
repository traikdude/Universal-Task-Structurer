import React, { useState } from 'react';
import { Link, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface UrlInputProps {
  onContentExtracted: (text: string) => void;
}

export function UrlInput({ onContentExtracted }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isValidUrl = (value: string) => {
    try { new URL(value); return true; } catch { return false; }
  };

  const handleFetch = async () => {
    if (!url.trim() || !isValidUrl(url)) {
      setStatus('error');
      setErrorMsg('🛑 Please enter a valid URL (e.g. https://example.com)');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      // Strip scripts/styles for cleaner text
      doc.querySelectorAll('script, style, nav, footer, aside').forEach(el => el.remove());
      const text = doc.body?.innerText?.trim() || '';
      if (!text) throw new Error('No readable content found on this page.');
      onContentExtracted(`\n--- 🔗 Content from ${url} ---\n${text.slice(0, 8000)}\n`);
      setStatus('success');
      setTimeout(() => { setStatus('idle'); setUrl(''); }, 2500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to fetch content from this URL.');
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch();
  };

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-1">
        🔗 Extract from URL
      </p>
      <div className={cn(
        'flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-all duration-200',
        status === 'error'
          ? 'border-red-300 ring-2 ring-red-100'
          : status === 'success'
          ? 'border-emerald-300 ring-2 ring-emerald-100'
          : 'border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100',
      )}>
        <span className="text-base shrink-0">
          {status === 'success' ? '✅' : status === 'error' ? '⚠️' : '🌐'}
        </span>
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setStatus('idle'); }}
          onKeyDown={handleKey}
          placeholder="https://paste-any-url-here.com"
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          disabled={status === 'loading'}
        />
        {url && (
          <button
            onClick={() => { setUrl(''); setStatus('idle'); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleFetch}
          disabled={!url.trim() || status === 'loading'}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shrink-0',
            status === 'loading'
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm',
          )}
        >
          {status === 'loading'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : '⚡ Fetch'
          }
        </button>
      </div>
      {status === 'error' && errorMsg && (
        <p className="mt-1.5 text-xs text-red-500 px-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {errorMsg}
        </p>
      )}
      {status === 'success' && (
        <p className="mt-1.5 text-xs text-emerald-600 px-1 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3 shrink-0" /> ✨ Content extracted and added to your notes!
        </p>
      )}
    </div>
  );
}
