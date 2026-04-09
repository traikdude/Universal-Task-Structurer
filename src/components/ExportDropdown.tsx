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
          "flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-l-md border border-r-0 shadow-sm",
          disabled
            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        )}
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : 
         downloaded ? <Check className="w-4 h-4 text-green-600" /> : 
         <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : downloaded ? 'Downloaded!' : 'Copy'}
      </button>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center px-2 py-1.5 rounded-r-md border shadow-sm transition-colors",
          disabled
            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        )}
      >
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
          <button
            onClick={() => handleAction(onExportMarkdown)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-gray-400" />
            📋 Copy as Markdown
          </button>
          <button
            onClick={() => handleAction(onExportCSV)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Table className="w-4 h-4 text-gray-400" />
            📊 Export as CSV
          </button>
          <button
            onClick={() => handleAction(onExportPlainText)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            📄 Export as Plain Text
          </button>
        </div>
      )}
    </div>
  );
}
