import React, { useState } from 'react';
import { Link, Loader2, Plus, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface UrlInputProps {
  onContentExtracted: (text: string, url: string) => void;
}

export function UrlInput({ onContentExtracted }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    setError('');

    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('No content received');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(s => s.remove());

      const textContent = doc.body.textContent || '';
      const cleanText = textContent.replace(/\s+/g, ' ').trim();

      if (cleanText) {
        const formattedText = `\n\n=== FROM ${targetUrl} ===\n${cleanText.substring(0, 15000)}\n=== END ===\n`;
        onContentExtracted(formattedText, targetUrl);
        setUrl('');
      } else {
        setError('No readable text found on this page.');
      }
    } catch (err) {
      console.error("Error fetching URL:", err);
      setError('Failed to fetch URL. It might be blocking automated access.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <form onSubmit={handleFetch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
            {isLoading 
              ? <Loader2 className="h-4 w-4 text-neon-cyan animate-spin" />
              : <span className="text-lg leading-none">🔗</span>
            }
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to extract content..."
            className={cn(
              "block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all duration-300 outline-none",
              "bg-slate-950/60 border border-slate-700/50 text-slate-200 placeholder-slate-600",
              "focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/10 focus:shadow-[0_0_15px_rgba(34,211,238,0.1)]",
              "hover:border-slate-600/60",
              isLoading && "opacity-60 cursor-wait"
            )}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 active:scale-95",
            isLoading || !url.trim()
              ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
              : "bg-neon-cyan text-slate-950 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:scale-[1.02]"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add
            </>
          )}
        </button>
      </form>
      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
