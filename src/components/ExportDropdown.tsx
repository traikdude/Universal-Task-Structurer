import React, { useState, useRef, useEffect } from 'react';
import { Copy, ChevronDown, FileText, Table, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExportDropdownProps {
  onExportMarkdown: () => void;
  onExportCSV: () => void;
  onExportPlainText: () => void;
  disabled: boolean;
  copied: boolean;
  downloaded: boolean;
}

export function ExportDropdown({ 
  onExportMarkdown, 
  onExportCSV, 
  onExportPlainText, 
  disabled, 
  copied,
  downloaded
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <button
        onClick={onExportMarkdown}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 text-xs font-bold transition-all px-3.5 py-2 rounded-l-xl border border-r-0 shadow-sm active:scale-[0.98]",
          disabled
            ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-emerald-400" /> : 
         downloaded ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-emerald-400" /> : 
         <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : downloaded ? 'Downloaded!' : 'Copy'}
      </button>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center px-2 py-2 rounded-r-xl border shadow-sm transition-all active:scale-[0.98]",
          disabled
            ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden transition-all animate-slide-down">
          <button
            onClick={() => handleAction(onExportMarkdown)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            📋 Copy as Markdown
          </button>
          <button
            onClick={() => handleAction(onExportCSV)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Table className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            📊 Export as CSV
          </button>
          <button
            onClick={() => handleAction(onExportPlainText)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            📄 Export as Plain Text
          </button>
        </div>
      )}
    </div>
  );
}
