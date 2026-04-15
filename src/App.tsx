import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Loader2, Copy, Check, ArrowRight, AlertCircle, RefreshCw, WifiOff, ArrowUpDown, Undo, Redo, Moon, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { processTaskStream, GeminiApiError } from './services/gemini';
import { cn } from './lib/utils';
import { ExampleChips } from './components/ExampleChips';
import { TaskListSelector } from './components/TaskListSelector';
import { MultiFileUpload } from './components/MultiFileUpload';
import { UrlInput } from './components/UrlInput';
import { VoiceInput } from './components/VoiceInput';
import { TaskCard, Task } from './components/TaskCard';
import { HistoryPanel, HistoryEntry } from './components/HistoryPanel';
import { ExportDropdown } from './components/ExportDropdown';
import { SendConfirmationModal, SendStatus } from './components/SendConfirmationModal';
import { generateCSV, generatePlainText } from './lib/utils';
import { useTaskHistory } from './hooks/useTaskHistory';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { fetchTaskLists, createTaskList, insertTask } from './services/googleTasks';
import { parseTasks, serializeTask } from './lib/taskEngine';

const MIN_CHARS = 15;
const MAX_CHARS = 100000;

// Auto-replace ➖ prefix with " - " before processing
function normalizePrefix(inputText: string) {
  return inputText.replace(/➖\s*/g, ' - ');
}

export default function App() {
  const [input, setInput] = useState('');
  const [lastProcessedInput, setLastProcessedInput] = useState('');
  const { state: tasks, set: setTasks, undo, redo, canUndo, canRedo, reset: resetTasks } = useTaskHistory([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendErrorMessage, setSendErrorMessage] = useState('');
  const [sendListName, setSendListName] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks',
    onSuccess: (tokenResponse) => {
        setAccessToken(tokenResponse.access_token);
        localStorage.setItem('google_access_token', tokenResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    localStorage.removeItem('google_access_token');
  };

  // Draft auto-save
  const draftRef = useRef('');
  useEffect(() => {
    draftRef.current = input;
  }, [input]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Confetti effect — with proper interval cleanup to prevent leaks
  const prevIsProcessing = useRef(isProcessing);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (prevIsProcessing.current && !isProcessing && tasks.length > 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (interval) clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#f97316', '#22c55e']
        });
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#f97316', '#22c55e']
        });
      }, 250);
    }
    prevIsProcessing.current = isProcessing;

    // Cleanup: clear the interval if the component unmounts during animation
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, tasks.length]);

  const handleProcess = async () => {
    if (!isOnline) {
      setError('You are currently offline. Processing will resume once your connection is restored.');
      return;
    }
    
    const normalizedInput = normalizePrefix(input);
    
    if (normalizedInput.length < MIN_CHARS) return;
    if (normalizedInput === lastProcessedInput) {
      const confirm = window.confirm("This looks identical to your last input. Would you like to reprocess it?");
      if (!confirm) return;
    }
    
    setIsProcessing(true);
    setError('');
    resetTasks([]);
    setStreamingContent('');
    setSendStatus('idle');
    
    try {
      const result = await processTaskStream(
        normalizedInput, 
        undefined, 
        undefined,
        (chunk) => {
          setStreamingContent(normalizePrefix(chunk));
        }
      );
      
      if (!result || result.trim() === '' || result.includes('No output generated')) {
        setError('No structured tasks were found. Try adding more context, action verbs, or dates to your input.');
      } else {
        const normalizedResult = normalizePrefix(result);
        const parsedTasks = parseTasks(normalizedResult);
        resetTasks(parsedTasks);
        setLastProcessedInput(normalizedInput);
        
        // Add to history
        setHistory(prev => {
          const newEntry: HistoryEntry = {
            id: `history-${Date.now()}`,
            timestamp: Date.now(),
            input: normalizedInput,
            tasks: parsedTasks,
            rawOutput: normalizedResult
          };
          const newHistory = [newEntry, ...prev];
          return newHistory.slice(0, 5); // Keep only last 5
        });
      }
    } catch (err: any) {
      // Surface structured error details instead of a generic message
      if (err instanceof GeminiApiError) {
        const modelInfo = err.model ? ` (model: ${err.model})` : '';
        const statusInfo = err.status ? ` [${err.status}]` : '';
        setError(`${err.message}${modelInfo}${statusInfo}`);
      } else {
        setError('Gemini couldn\'t process your request right now. This might be a temporary issue—please try again in a moment.');
      }
      console.error('[App] Task processing error:', err);
    } finally {
      setIsProcessing(false);
      setStreamingContent('');
    }
  };

  const handleCopy = async () => {
    const selectedTasks = tasks.filter(t => t.isSelected);
    if (selectedTasks.length === 0) return;
    try {
      const selectedTasksText = selectedTasks.map(t => t.rawContent).join('\n\n');
      await navigator.clipboard.writeText(selectedTasksText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExportCSV = () => {
    const selectedTasks = tasks.filter(t => t.isSelected);
    if (selectedTasks.length === 0) return;
    
    const csvContent = generateCSV(selectedTasks);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleExportPlainText = async () => {
    const selectedTasks = tasks.filter(t => t.isSelected);
    if (selectedTasks.length === 0) return;
    
    try {
      const plainText = generatePlainText(selectedTasks);
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSendToTasks = async (listId: string, listTitle?: string) => {
    if (!accessToken) {
      login();
      return;
    }

    const selectedTasks = tasks.filter(t => t.isSelected);
    if (selectedTasks.length === 0) return;

    // Capture the human-readable list name for the modal
    setSendListName(listTitle || listId);
    setSendErrorMessage('');
    setSendStatus('sending');

    try {
      // Push each selected task to Google Tasks sequentially.
      // The listId is the real Google Tasks list ID provided by TaskListSelector.
      for (const t of selectedTasks) {
        await insertTask(accessToken, listId, t);
      }

      // Only reach here on a fully confirmed success
      setSendStatus('success');
    } catch (e: any) {
      console.error('[App] Google Tasks send error:', e);

      if (e?.status === 401) {
        // Expired token — close modal and force re-auth
        setSendStatus('idle');
        handleLogout();
        alert('Your Google session has expired. Please sign in again.');
      } else {
        const msg = e?.message
          ? `${e.message}${e.status ? ` (HTTP ${e.status})` : ''}`
          : 'An unexpected error occurred. Please try again.';
        setSendErrorMessage(msg);
        setSendStatus('error');
      }
    }
  };

/**
 * Reconstructs the raw markdown block for a task from its object state.
 * This replaces the fragile regex-based patching logic.
 */
const serializeTask = (task: Task): string => {
  const priorityMap: Record<string, string> = {
    'P0': '🔴 **P0 — Critical**',
    'P1': '🟠 **P1 — High**',
    'P2': '🟡 **P2 — Medium**',
    'P3': '🟢 **P3 — Low**'
  };

  const priorityEmoji = priorityMap[task.priority] || priorityMap['P3'];
  
  // Format the date for the display line
  let dateDisplay = 'Not specified';
  if (task.dueDate) {
    const dateObj = new Date(task.dueDate + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      dateDisplay = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }
  }

  // Format time for display (e.g., "2:30 PM")
  let timeDisplay = '';
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeDisplay = `⏰ **Time:** ${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  return `## ✅ GOOGLE TASK OUTPUT
### 📌 TASK HEADER (Title)
${task.title}

### 📊 PRIORITY & STATUS
Priority: ${priorityEmoji}
Status: 📥 Queued for Processing

### 📅 DUE DATE & TIME
📆 **Date:** ${dateDisplay}
${timeDisplay}
due: ${task.dueDate || 'none'}

### 📁 TARGET LIST
➖ **List Name:** ${task.suggestedList}

### 📝 TASK DESCRIPTION & NOTES
[Automatically structured from input context]
---
`;
};

const handleUpdateTask = (id: string, updates: Partial<Task>) => {
  setTasks(prev => prev.map(t => {
    if (t.id !== id) return t;
    const updatedTask = { ...t, ...updates, isEdited: true };
    // Deterministically reconstruct the rawContent from the updated object state
    updatedTask.rawContent = serializeTask(updatedTask);
    return updatedTask;
  }));
};

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleSelect = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t));
  };

  const handleToggleAll = () => {
    const allSelected = tasks.every(t => t.isSelected);
    setTasks(prev => prev.map(t => ({ ...t, isSelected: !allSelected })));
  };

  const handleRestoreInput = (entry: HistoryEntry) => {
    setInput(entry.input);
  };

  const handleViewOutput = (entry: HistoryEntry) => {
    resetTasks(entry.tasks);
    setInput(entry.input);
    setLastProcessedInput(entry.input);
    setError('');
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    setTasks(prev => {
      const sorted = [...prev].sort((a, b) => {
        let valA = a[key as keyof Task];
        let valB = b[key as keyof Task];
        
        if (valA === undefined) valA = '';
        if (valB === undefined) valB = '';

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
      return sorted;
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    setTasks(prev => {
      const items = Array.from(prev);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      return items;
    });
  };

  const selectedCount = tasks.filter(t => t.isSelected).length;

  const inputLength = input.length;
  const isTooShort = inputLength > 0 && inputLength < MIN_CHARS;
  const isTooLong = inputLength > MAX_CHARS;
  const isValid = inputLength >= MIN_CHARS && !isTooLong;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans" style={{backgroundImage: 'radial-gradient(at 5% 10%, rgba(34,211,238,0.07) 0px, transparent 50%), radial-gradient(at 95% 90%, rgba(236,72,153,0.06) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(16,185,129,0.03) 0px, transparent 70%)'}}>
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-neon-cyan to-blue-500 p-2 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <CheckSquare className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">Universal Task Structurer</h1>
            <p className="text-xs text-slate-500 font-medium">✨ Transform any text or image into a structured Google Task</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {accessToken ? (
            <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all">
              Sign Out
            </button>
          ) : (
            <button onClick={() => login()} className="text-xs font-black bg-neon-cyan/10 text-neon-cyan px-4 py-2 rounded-full border border-neon-cyan/30 hover:bg-neon-cyan hover:text-slate-950 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] uppercase tracking-wider">
              🔗 Connect Google Tasks
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all border border-transparent hover:border-slate-700"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          {!isOnline && (
            <div className="flex items-center gap-2 text-neon-amber bg-neon-amber/10 px-3 py-1.5 rounded-full text-xs font-black border border-neon-amber/30 uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Input Column */}
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] animate-fade-in-up">
          <ExampleChips onSelect={(text) => setInput(text)} />
          
          <div className={cn(
            "flex-1 relative rounded-2xl glass-panel overflow-hidden flex flex-col transition-all duration-300",
            !isValid && inputLength > 0 ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-slate-800/50 focus-within:border-neon-cyan/50 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.1)]",
          )}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="✏️  Paste your notes, meeting transcripts, to-do lists, or any unstructured text here...\n\nOr drop images & PDFs below for AI-powered OCR extraction 👇"
              className="flex-1 w-full p-6 resize-none outline-none text-slate-200 bg-transparent font-mono text-sm placeholder-slate-400 scrollbar-thin leading-relaxed"
            />
            
            <div className="px-4 pb-2 bg-slate-950/30">
              <MultiFileUpload 
                onTextExtracted={(text) => {
                  setInput(prev => prev + text);
                }}
              />
              <UrlInput 
                onContentExtracted={(text) => {
                  setInput(prev => prev + text);
                }}
              />
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
                <VoiceInput 
                  onTranscript={(text) => {
                    setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
                  }}
                />
                <span className={cn(
                  "transition-colors",
                  isTooLong ? "text-red-400" : inputLength > MAX_CHARS * 0.9 ? "text-neon-amber" : "text-slate-500"
                )}>
                  {inputLength.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleProcess}
                disabled={!isValid || isProcessing || !isOnline}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all w-full sm:w-auto justify-center active:scale-95 shadow-lg",
                  !isValid || isProcessing || !isOnline
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700" 
                    : "bg-neon-cyan text-slate-950 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-[1.02]"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Process Intelligence
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <HistoryPanel 
            history={history}
            onRestoreInput={handleRestoreInput}
            onViewOutput={handleViewOutput}
            onClearHistory={handleClearHistory}
          />
        </div>

        {/* Output Column */}
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-neon-emerald shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              Intelligence Output
              {tasks.length > 0 && (
                <span className="bg-neon-emerald/10 text-neon-emerald text-[10px] px-2 py-0.5 rounded-full border border-neon-emerald/30 font-black ml-2">
                  {tasks.length} FOUND
                </span>
              )}
            </h2>
            
            {tasks.length > 0 && !isProcessing && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 mr-2 border-r border-slate-800 pr-3">
                  <button onClick={undo} disabled={!canUndo} className={cn("p-1.5 rounded-lg transition-all", canUndo ? "text-slate-400 hover:text-neon-cyan hover:bg-slate-800" : "text-slate-700 cursor-not-allowed")} title="Undo (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
                  <button onClick={redo} disabled={!canRedo} className={cn("p-1.5 rounded-lg transition-all", canRedo ? "text-slate-400 hover:text-neon-cyan hover:bg-slate-800" : "text-slate-700 cursor-not-allowed")} title="Redo (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
                </div>
                <TaskListSelector 
                  onSend={handleSendToTasks} 
                  isSending={sendStatus === 'sending'} 
                  selectedCount={selectedCount} 
                  totalCount={tasks.length} 
                  suggestedListTitle={tasks[0]?.suggestedList}
                  accessToken={accessToken}
                />

                <ExportDropdown 
                  onExportMarkdown={handleCopy}
                  onExportCSV={handleExportCSV}
                  onExportPlainText={handleExportPlainText}
                  disabled={selectedCount === 0}
                  copied={copied}
                  downloaded={downloaded}
                />
              </div>
            )}
          </div>

          <div className="flex-1 rounded-2xl glass-panel overflow-hidden flex flex-col relative">
            {isProcessing && streamingContent ? (
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30">
                <div className="markdown-body opacity-80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent + ' ▌'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md z-20 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin"></div>
                  <Loader2 className="w-8 h-8 text-neon-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-6 text-slate-300 font-black uppercase tracking-[0.2em] text-xs animate-pulse">Neural Structuring...</p>
              </div>
            ) : error ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-red-500/5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 font-bold mb-6 max-w-md">{error}</p>
                <button 
                  onClick={handleProcess}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-wider text-xs shadow-lg active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reprocess
                </button>
              </div>
            ) : tasks.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4 bg-slate-950/20">
                <div className="flex justify-between items-center mb-4 px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800/50 shadow-inner">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Sort Matrix:</span>
                    <button onClick={() => handleSort('priority')} className={cn("transition-all", sortConfig?.key === 'priority' ? "text-neon-cyan" : "text-slate-400 hover:text-slate-200")}>Priority {sortConfig?.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    <button onClick={() => handleSort('dueDate')} className={cn("transition-all", sortConfig?.key === 'dueDate' ? "text-neon-cyan" : "text-slate-400 hover:text-slate-200")}>Date {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                  </div>
                  <button 
                    onClick={handleToggleAll} 
                    className="text-[10px] font-black uppercase tracking-widest text-neon-cyan hover:text-white transition-colors"
                  >
                    {selectedCount === tasks.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="tasks-list">
                    {(provided) => (
                      <div 
                        className="flex flex-col gap-4"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  index={index}
                                  totalTasks={tasks.length}
                                  onUpdate={handleUpdateTask}
                                  onDelete={handleDeleteTask}
                                  onToggleSelect={handleToggleSelect}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            ) : (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-6">
                {/* Animated glow orb */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-neon-cyan/10 blur-2xl animate-pulse" style={{width: '100px', height: '100px', transform: 'translate(-10%, -10%)'}} />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.08)]">
                    <span className="text-4xl">🧠</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-200 tracking-tight">Intelligence Output</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Paste your notes on the left and click <span className="text-neon-cyan font-bold">Process Intelligence</span> to extract structured tasks.
                  </p>
                </div>

                {/* Step hints */}
                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  {[
                    { emoji: '✏️', label: 'Paste notes or text' },
                    { emoji: '🖼️', label: 'Or drop an image / PDF' },
                    { emoji: '⚡', label: 'Click Process Intelligence' },
                    { emoji: '📤', label: 'Send to Google Tasks' },
                  ].map(({ emoji, label }, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 text-left">
                      <span className="text-xl w-7 text-center">{emoji}</span>
                      <span className="text-xs font-bold text-slate-400 tracking-wide">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Send Confirmation Modal — overlays everything, only visible during send flow */}
      <SendConfirmationModal
        status={sendStatus}
        taskCount={tasks.filter(t => t.isSelected).length}
        listName={sendListName}
        errorMessage={sendErrorMessage}
        onRetry={() => {
          // Re-trigger the send with the same list. User must click Send again
          // because we don't cache the listId here — so we just close and let them retry.
          setSendStatus('idle');
        }}
        onClose={() => setSendStatus('idle')}
      />
    </div>
  );
}
