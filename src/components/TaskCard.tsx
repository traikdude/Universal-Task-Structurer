import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, Code, GripVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  suggestedList?: string;
  rawContent: string;
  isSelected: boolean;
  isEdited: boolean;
}

interface TaskCardProps {
  task: Task;
  index: number;
  totalTasks: number;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

export function TaskCard({ task, index, totalTasks, onUpdate, onDelete, onToggleSelect }: TaskCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRawEditMode, setIsRawEditMode] = useState(false);
  const [rawEditContent, setRawEditContent] = useState(task.rawContent);

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setRawEditContent(task.rawContent);
  }, [task.rawContent]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() || 'Untitled Task' });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(task.title);
    }
  };

  const handleRawSave = () => {
    setIsRawEditMode(false);
    if (rawEditContent !== task.rawContent) {
      onUpdate(task.id, { rawContent: rawEditContent });
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(task.id);
    }, 300); // match animation duration
  };

  // Strip title and priority from markdown for display
  let displayMarkdown = task.rawContent;
  displayMarkdown = displayMarkdown.replace(/## ✅ GOOGLE TASK OUTPUT\n*/i, '');
  displayMarkdown = displayMarkdown.replace(/### 📌 TASK HEADER(?: \(Title\))?\n+[^\n]+\n*/i, '');
  displayMarkdown = displayMarkdown.replace(/(🔴|🟠|🟡|🟢)\s*\*\*P[0-3][^*]*\*\*\n*/i, '');

  return (
    <div 
      className={cn(
        "relative bg-white border rounded-xl p-5 pl-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 hover:z-10 group/card", 
        task.isSelected ? "border-blue-300 ring-2 ring-blue-100 shadow-md" : "border-gray-200 opacity-75 shadow-sm",
        isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      )}
    >
      <div className="absolute top-1/2 -translate-y-1/2 left-2 text-gray-300 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="absolute top-5 left-8">
        <input 
          type="checkbox" 
          checked={task.isSelected} 
          onChange={() => onToggleSelect(task.id)}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </div>
      
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {task.isEdited && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            Edited
          </span>
        )}
        <button 
          onClick={() => setIsRawEditMode(!isRawEditMode)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            isRawEditMode ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
          )}
          title="Toggle Raw Edit"
        >
          <Code className="w-4 h-4" />
        </button>
        <button 
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="ml-8">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-3">
          <span>Task {index + 1} of {totalTasks}</span>
          
          <select 
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
            className={cn(
              "text-xs font-medium border-transparent rounded px-2 py-1 outline-none cursor-pointer shadow-sm transition-colors",
              task.priority === 'P0' ? "text-white bg-gradient-to-r from-red-500 to-rose-600 animate-pulse" :
              task.priority === 'P1' ? "text-white bg-gradient-to-r from-orange-500 to-amber-500" :
              task.priority === 'P2' ? "text-white bg-gradient-to-r from-yellow-400 to-yellow-500" :
              "text-white bg-gradient-to-r from-emerald-400 to-green-500"
            )}
          >
            <option value="P0" className="bg-white text-gray-900">🔴 P0 — Critical</option>
            <option value="P1" className="bg-white text-gray-900">🟠 P1 — High</option>
            <option value="P2" className="bg-white text-gray-900">🟡 P2 — Medium</option>
            <option value="P3" className="bg-white text-gray-900">🟢 P3 — Low</option>
          </select>
        </div>
        
        <div className="mb-4 group">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-xl font-semibold text-gray-900 w-full border-b-2 border-blue-500 outline-none bg-blue-50/50 px-1 py-0.5 rounded-t"
            />
          ) : (
            <h3 
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-semibold text-gray-900 cursor-pointer flex items-center gap-2 hover:text-blue-700 transition-colors"
            >
              {task.title}
              <Edit2 className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
          )}
        </div>

        {isRawEditMode ? (
          <div className="grid grid-cols-2 gap-4 border border-gray-200 rounded-lg overflow-hidden h-64">
            <textarea
              value={rawEditContent}
              onChange={(e) => setRawEditContent(e.target.value)}
              onBlur={handleRawSave}
              className="w-full h-full p-3 text-sm font-mono bg-gray-50 text-gray-800 resize-none outline-none border-r border-gray-200"
            />
            <div className="w-full h-full p-3 overflow-y-auto bg-white markdown-body text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {rawEditContent}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayMarkdown}
            </ReactMarkdown>
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Due Date:</label>
          <input 
            type="date" 
            value={task.dueDate}
            onChange={(e) => onUpdate(task.id, { dueDate: e.target.value })}
            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700"
          />
        </div>
      </div>
    </div>
  );
}
