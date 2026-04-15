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

  const [activeTab, setActiveTab] = React.useState<'input' | 'output'>('input');

  // 📱 Mobile UX: auto-switch to Output tab when processing completes with results
  React.useEffect(() => {
    if (!isProcessing && tasks.length > 0) {
      setActiveTab('output');
    }
  }, [isProcessing, tasks.length]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 🏠 Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-sm shrink-0">
            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">
              ✅ <span className="hidden xs:inline">Universal </span>Task Structurer
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">✨ Transform any text or image into a structured Google Task 🚀</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-[10px] font-semibold border border-amber-200">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">📵 Offline</span>
            </div>
          )}
          {accessToken ? (
            <button onClick={handleLogout} className="joy-btn-ghost text-xs px-2 py-1.5">
              <span className="hidden sm:inline">👋 </span>Sign Out
            </button>
          ) : (
            <button
              onClick={() => login()}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-[11px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              🔗 <span className="hidden sm:inline">Connect </span>Tasks
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      {/* 📱 Mobile Tab Bar — only visible on small screens */}
      <div className="lg:hidden bg-white border-b border-gray-200 flex sticky top-[56px] z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('input')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all',
            activeTab === 'input'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          ✏️ Input
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all',
            activeTab === 'output'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          🧠 Output
          {tasks.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 lg:grid lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Input Column */}
        <div className={cn(
          "flex flex-col gap-4 animate-fade-in-up",
          /* Mobile: show only when input tab active, full natural height */
          "lg:h-[calc(100vh-8rem)]",
          activeTab === 'input' ? 'flex' : 'hidden lg:flex',
        )}>
          <ExampleChips onSelect={(text) => setInput(text)} />
          
          <div className={cn(
            "flex-1 relative rounded-2xl joy-card overflow-hidden flex flex-col",
            !isValid && inputLength > 0 ? "border-red-300 ring-2 ring-red-100" : "focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100",
          )}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="✏️  Paste your notes, meeting transcripts, or to-do lists here...

💡 Tip: You can also drop images & PDFs below for AI-powered OCR! 👇"
              className="w-full p-4 sm:p-5 resize-none outline-none text-gray-800 bg-transparent text-sm placeholder-gray-400 leading-relaxed font-sans min-h-[180px] lg:flex-1"
            />
            
            <div className="px-4 pb-2 bg-gray-50 border-t border-gray-100">
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

            <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <VoiceInput 
                  onTranscript={(text) => {
                    setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
                  }}
                />
                <span className={cn(
                  "font-mono",
                  isTooLong ? "text-red-500" : inputLength > MAX_CHARS * 0.9 ? "text-amber-500" : "text-gray-400"
                )}>
                  {inputLength.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                </span>
              </div>

              <button
                onClick={handleProcess}
                disabled={!isValid || isProcessing || !isOnline}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all w-full sm:w-auto justify-center",
                  !isValid || isProcessing || !isOnline
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm hover:shadow-md"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    🔄 Analyzing...
                  </>
                ) : (
                  <>
                    ⚡ Process Intelligence
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
        <div
          className={cn(
            "flex flex-col gap-4 animate-fade-in-up",
            "lg:h-[calc(100vh-8rem)]",
            activeTab === 'output' ? 'flex' : 'hidden lg:flex',
          )}
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              🧠 Intelligence Output
              {tasks.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">
                  {tasks.length} found
                </span>
              )}
            </h2>
            
            {tasks.length > 0 && !isProcessing && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 mr-2 border-r border-gray-200 pr-3">
                  <button onClick={undo} disabled={!canUndo} className={cn("p-1.5 rounded-lg transition-all", canUndo ? "text-gray-500 hover:text-blue-600 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed")} title="Undo (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
                  <button onClick={redo} disabled={!canRedo} className={cn("p-1.5 rounded-lg transition-all", canRedo ? "text-gray-500 hover:text-blue-600 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed")} title="Redo (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
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

          <div className="flex-1 rounded-2xl joy-card overflow-hidden flex flex-col relative min-h-[400px] lg:min-h-0">
            {isProcessing && streamingContent ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
                <div className="markdown-body opacity-80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent + ' ▌'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <Loader2 className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-gray-500 font-semibold text-sm animate-pulse">🧠 Analyzing your notes...</p>
              </div>
            ) : error ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-500 font-semibold mb-6 max-w-md text-sm">{error}</p>
                <button
                  onClick={handleProcess}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-semibold text-sm active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  🔄 Try Again
                </button>
              </div>
            ) : tasks.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="flex justify-between items-center mb-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500">
                    <span>Sort:</span>
                    <button onClick={() => handleSort('priority')} className={cn("transition-all px-2 py-0.5 rounded-lg", sortConfig?.key === 'priority' ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}>🔴 Priority {sortConfig?.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    <button onClick={() => handleSort('dueDate')} className={cn("transition-all px-2 py-0.5 rounded-lg", sortConfig?.key === 'dueDate' ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}>📅 Date {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                  </div>
                  <button
                    onClick={handleToggleAll}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50"
                  >
                    {selectedCount === tasks.length ? '☑️ Deselect All' : '✅ Select All'}
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
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-5">
                {/* 🌟 Hero Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-3xl flex items-center justify-center shadow-sm animate-bounce-in">
                  <span className="text-4xl">🧠</span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-gray-800">🎯 Ready to Structure!</h3>
                  <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                    Paste your unstructured notes on the left, then click
                    <span className="font-semibold text-blue-600"> ⚡ Process Intelligence </span>
                    to extract clean, actionable tasks! ✨
                  </p>
                </div>

                {/* 📋 Step Cards */}
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {[
                    { emoji: '✏️', label: 'Paste notes, lists, or meeting transcripts', color: 'bg-blue-50 border-blue-100' },
                    { emoji: '🖼️', label: 'Or upload images & PDFs for OCR magic!',     color: 'bg-purple-50 border-purple-100' },
                    { emoji: '⚡', label: 'Click Process Intelligence',                  color: 'bg-amber-50 border-amber-100' },
                    { emoji: '📤', label: 'Send structured tasks to Google Tasks 🎉',   color: 'bg-emerald-50 border-emerald-100' },
                  ].map(({ emoji, label, color }, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left ${color}`}>
                      <span className="text-lg w-6 text-center shrink-0">{emoji}</span>
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-gray-400 mt-1">🌈 Powered by Gemini AI · Built with ❤️</p>
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
