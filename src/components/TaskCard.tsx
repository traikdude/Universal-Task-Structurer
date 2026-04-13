import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, Code, GripVertical, CheckSquare, Clock, Calendar, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;   // HH:mm format (24h), e.g. "14:30"
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
    }, 300);
  };

  // Priority Style Matrix
  const priorityStyles = {
    'P0': 'border-red-500/50 text-red-400 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse',
    'P1': 'border-orange-500/50 text-orange-400 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    'P2': 'border-amber-500/50 text-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    'P3': 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
  };

  const currentPriorityStyle = priorityStyles[task.priority as keyof typeof priorityStyles] || priorityStyles['P3'];

  // Strip structural headers for clean display
  let displayMarkdown = task.rawContent;
  displayMarkdown = displayMarkdown.replace(/## ✅ GOOGLE TASK OUTPUT\n*/i, '');
  displayMarkdown = displayMarkdown.replace(/### 📌 TASK HEADER(?: \(Title\))?\n+[^\n]+\n*/i, '');
  displayMarkdown = displayMarkdown.replace(/(🔴|🟠|🟡|🟢)\s*\*\*P[0-3][^*]*\*\*\n*/i, '');

  return (
    <div 
      className={cn(
        "group relative glass-card overflow-hidden transition-all duration-500 rounded-2xl", 
        task.isSelected ? "ring-2 ring-neon-cyan/40 bg-slate-900/80 shadow-[0_0_30px_rgba(34,211,238,0.1)]" : "border-slate-800 opacity-90 hover:opacity-100 hover:border-slate-700/50",
        isDeleting ? "opacity-0 scale-95 translate-x-10" : "opacity-100 scale-100 translate-x-0"
      )}
    >
      {/* Background Accent */}
      {task.isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent pointer-events-none"></div>
      )}

      {/* Drag Anchor */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="p-5 pl-12">
        {/* Header: Identity & Priority */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onToggleSelect(task.id)}
              className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                task.isSelected 
                  ? "bg-neon-cyan border-neon-cyan shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                  : "border-slate-700 hover:border-slate-500 bg-slate-950/50"
              )}
            >
              {task.isSelected && <CheckSquare className="w-4 h-4 text-slate-950 stroke-[3]" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> OBJECTIVE {index + 1}
              </span>
              <select 
                value={task.priority}
                onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full border transition-all duration-500 outline-none cursor-pointer appearance-none",
                  currentPriorityStyle
                )}
              >
                <option value="P0" className="bg-slate-900">🔴 P0 — CRITICAL</option>
                <option value="P1" className="bg-slate-900">🟠 P1 — HIGH</option>
                <option value="P2" className="bg-slate-900">🟡 P2 — MEDIUM</option>
                <option value="P3" className="bg-slate-900">🟢 P3 — LOW</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {task.isEdited && (
              <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-neon-amber/10 text-neon-amber border border-neon-amber/30 mr-2">
                MODIFIED
              </span>
            )}
            <button 
              onClick={() => setIsRawEditMode(!isRawEditMode)}
              className={cn(
                "p-2 rounded-xl transition-all",
                isRawEditMode ? "bg-neon-cyan/20 text-neon-cyan shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "text-slate-500 hover:text-neon-cyan hover:bg-slate-800"
              )}
              title="Matrix View"
            >
              <Code className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Purge Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-5">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-xl font-black text-slate-100 w-full bg-slate-950/50 border-b-2 border-neon-cyan outline-none px-2 py-1 rounded-t-xl transition-all placeholder-slate-700"
            />
          ) : (
            <h3 
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-black text-slate-100 cursor-text flex items-center gap-3 group/title"
            >
              <span className="hover:text-neon-cyan transition-colors">{task.title}</span>
              <Edit2 className="w-4 h-4 text-slate-700 opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </h3>
          )}
        </div>

        {/* Dynamic Content Area */}
        <div className="relative mb-6">
          {isRawEditMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64 animate-fade-in-up">
              <textarea
                value={rawEditContent}
                onChange={(e) => setRawEditContent(e.target.value)}
                onBlur={handleRawSave}
                placeholder="Neural source code..."
                className="w-full h-full p-4 text-xs font-mono bg-slate-950/80 text-neon-cyan/80 border border-slate-800 rounded-2xl resize-none outline-none focus:border-neon-cyan/40 transition-all scrollbar-thin shadow-inner"
              />
              <div className="markdown-body bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50 overflow-y-auto scrollbar-thin">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rawEditContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="markdown-body bg-slate-950/20 rounded-2xl p-1 transition-all">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayMarkdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Footer: Date & Time Telemetry */}
        <div className="pt-4 border-t border-slate-800/50 flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Calendar className="w-3 h-3 text-neon-cyan" /> DEPLOYMENT DATE
            </label>
            <input 
              type="date" 
              value={task.dueDate}
              onChange={(e) => onUpdate(task.id, { dueDate: e.target.value })}
              className="w-full bg-slate-950/50 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-neon-cyan/40 transition-all cursor-pointer shadow-inner"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Clock className="w-3 h-3 text-neon-pink" /> PRECISION TIME
            </label>
            <div className="relative group/time">
              <input 
                type="time" 
                value={task.dueTime}
                onChange={(e) => onUpdate(task.id, { dueTime: e.target.value })}
                className="w-full bg-slate-950/50 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-neon-pink/40 transition-all cursor-pointer shadow-inner pr-10"
              />
              {!task.dueTime && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 italic pointer-events-none group-hover/time:text-neon-pink/40 transition-colors">TBD</span>
              )}
            </div>
          </div>
          
          <div className="ml-auto flex flex-col gap-1.5 items-end">
             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">TARGET CLUSTER</label>
             <div className="text-[10px] font-black text-neon-cyan bg-neon-cyan/10 px-3 py-2 rounded-xl border border-neon-cyan/30 shadow-[0_0_10px_rgba(34,211,238,0.1)] uppercase tracking-wider">
               {task.suggestedList || 'System Default'}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
