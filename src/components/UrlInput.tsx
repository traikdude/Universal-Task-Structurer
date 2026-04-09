import React, { useState } from 'react';
import { Link, Loader2, Plus } from 'lucide-react';
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
      // Using allorigins as a CORS proxy to fetch the HTML content
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('No content received');
      }

      // Parse HTML and extract text
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // Remove script and style elements
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
    <div className="mt-4">
      <form onSubmit={handleFetch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to extract content..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={cn(
            "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors",
            (isLoading || !url.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </>
          )}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
