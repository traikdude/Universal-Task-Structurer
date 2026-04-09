import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, Trash2, RotateCcw, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from './TaskCard';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  input: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  tasks: Task[];
  rawOutput: string;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onRestoreInput: (entry: HistoryEntry) => void;
  onViewOutput: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

export function HistoryPanel({ history, onRestoreInput, onViewOutput, onClearHistory }: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString()} at ${timeStr}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <History className="w-5 h-5 text-gray-500" />
          📜 Session History
          {history.length > 0 && (
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-2">
              {history.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">
              No history yet. Process a task to see it here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-end mb-1">
                <button
                  onClick={onClearHistory}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear History
                </button>
              </div>
              
              {history.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <span>🕐 {formatTime(entry.timestamp)}</span>
                      <span>•</span>
                      <span className="text-blue-600">📊 {entry.tasks.length} tasks</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3 italic line-clamp-2">
                    "{entry.input.length > 60 ? entry.input.substring(0, 60) + '...' : entry.input || 'Image input'}"
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestoreInput(entry)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Input
                    </button>
                    <button
                      onClick={() => onViewOutput(entry)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Output
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
