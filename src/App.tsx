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

const MIN_CHARS = 15;
const MAX_CHARS = 100000;

// Auto-replace ➖ prefix with " - " before processing
function normalizePrefix(inputText: string) {
  return inputText.replace(/➖\s*/g, ' - ');
}

const parseTasks = (markdown: string): Task[] => {
  let parsedTasks = markdown.split(/(?=## ✅ GOOGLE TASK OUTPUT)/i).filter(t => t.trim().length > 0);
  if (parsedTasks.every(t => !t.includes('## ✅ GOOGLE TASK OUTPUT'))) {
    parsedTasks = [markdown];
  } else {
    parsedTasks = parsedTasks.filter(t => t.includes('## ✅ GOOGLE TASK OUTPUT'));
  }

  return parsedTasks.map((raw, idx) => {
    let title = 'Untitled Task';
    const titleMatch = raw.match(/### 📌 TASK HEADER(?: \(Title\))?\n+([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    let dueDate = '';
    const dueMatch = raw.match(/due:\s*(\d{4}-\d{2}-\d{2})/i);
    if (dueMatch) {
      dueDate = dueMatch[1];
    }

    // Extract time — supports formats like "⏰ **Time:** 2:00 PM", "time: 14:00", "10:30 AM"
    let dueTime = '';
    const timeMatch24 = raw.match(/(?:time:|⏰\s*\*\*Time:\*\*)\s*(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
    if (timeMatch24) {
      let hours = parseInt(timeMatch24[1].split(':')[0], 10);
      const minutes = timeMatch24[1].split(':')[1];
      const period = timeMatch24[2];
      if (period) {
        // Convert 12h to 24h
        if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      dueTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    let priority = 'P3';
    const priorityMatch = raw.match(/(🔴|🟠|🟡|🟢)\s*\*\*(P[0-3])/);
    if (priorityMatch) {
      priority = priorityMatch[2];
    }

    let suggestedList = 'Personal';
    const listMatch = raw.match(/➖ \*\*List Name:\*\*\s*(Personal|Work|Shopping)/i);
    if (listMatch) {
      suggestedList = listMatch[1];
    }

    return {
      id: `task-${Date.now()}-${idx}`,
      title,
      dueDate,
      dueTime,
      priority,
      suggestedList,
      rawContent: raw,
      isSelected: true,
      isEdited: false,
    };
  });
};

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

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      let newRaw = t.rawContent;
      
      if (updates.title !== undefined && updates.title !== t.title) {
        newRaw = newRaw.replace(/(### 📌 TASK HEADER(?: \(Title\))?\n+)[^\n]+/, `$1${updates.title}`);
      }
      
      if (updates.priority !== undefined && updates.priority !== t.priority) {
        const priorityMap: Record<string, string> = {
          'P0': '🔴 **P0 — Critical**',
          'P1': '🟠 **P1 — High**',
          'P2': '🟡 **P2 — Medium**',
          'P3': '🟢 **P3 — Low**'
        };
        newRaw = newRaw.replace(/(🔴|🟠|🟡|🟢)\s*\*\*P[0-3][^*]*\*\*/, priorityMap[updates.priority]);
      }
      
      // Determine the effective date and time after this update
      const effectiveDate = updates.dueDate ?? t.dueDate;
      const effectiveTime = updates.dueTime ?? t.dueTime;

      if (updates.dueDate !== undefined && updates.dueDate !== t.dueDate) {
        if (newRaw.match(/due:\s*\d{4}-\d{2}-\d{2}/i)) {
          newRaw = newRaw.replace(/due:\s*\d{4}-\d{2}-\d{2}/i, `due: ${updates.dueDate}`);
        } else {
          newRaw = newRaw.replace(/(### 📅 DUE DATE & TIME\n)/i, `$1due: ${updates.dueDate}\n`);
        }
        const dateObj = new Date(updates.dueDate + 'T12:00:00');
        if (!isNaN(dateObj.getTime())) {
          const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          newRaw = newRaw.replace(/(📆 \*\*Date:\*\* )[^\n]+/, `$1${formattedDate}`);
        }
      }

      if (updates.dueTime !== undefined && updates.dueTime !== t.dueTime) {
        // Format time for display (e.g., "2:30 PM")
        let displayTime = updates.dueTime;
        if (updates.dueTime) {
          const [h, m] = updates.dueTime.split(':').map(Number);
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
          displayTime = `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
        }

        // Update or insert the time line in the raw markdown
        if (newRaw.match(/⏰\s*\*\*Time:\*\*\s*[^\n]*/i)) {
          newRaw = newRaw.replace(/⏰\s*\*\*Time:\*\*\s*[^\n]*/i, `⏰ **Time:** ${displayTime}`);
        } else if (newRaw.match(/📆\s*\*\*Date:\*\*/i)) {
          // Insert time line right after the date line
          newRaw = newRaw.replace(/(📆\s*\*\*Date:\*\*\s*[^\n]*)/, `$1\n⏰ **Time:** ${displayTime}`);
        } else if (newRaw.match(/### 📅 DUE DATE & TIME/i)) {
          newRaw = newRaw.replace(/(### 📅 DUE DATE & TIME\n)/i, `$1⏰ **Time:** ${displayTime}\n`);
        }
      }
      
      return { ...t, ...updates, rawContent: newRaw, isEdited: true };
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Universal Task Structurer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Transform any text or image into a structured Google Task</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {accessToken ? (
            <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
              Sign Out
            </button>
          ) : (
            <button onClick={() => login()} className="text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm">
              Connect Google Tasks
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {!isOnline && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-800">
              <WifiOff className="w-4 h-4" />
              Offline Mode
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Input Column */}
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
          <ExampleChips onSelect={(text) => setInput(text)} />
          
          <div className={cn(
            "flex-1 relative rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col transition-all",
            !isValid && inputLength > 0 ? "border-red-300 focus-within:ring-red-500" : "border-gray-200 focus-within:ring-blue-500",
            "focus-within:ring-2 focus-within:border-transparent"
          )}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your unstructured notes, casual thoughts, meeting transcripts, or emails here..."
              className="flex-1 w-full p-4 resize-none outline-none text-gray-700 bg-transparent"
            />
            
            <div className="px-4 pb-2">
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

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 text-xs">
                <VoiceInput 
                  onTranscript={(text) => {
                    setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
                  }}
                />
                <span className={cn(
                  "font-medium",
                  isTooLong ? "text-red-500" : inputLength > MAX_CHARS * 0.9 ? "text-amber-500" : "text-gray-400"
                )}>
                  {inputLength.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                </span>
                {isTooShort && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Too short
                  </span>
                )}
                {isTooLong && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Too long
                  </span>
                )}
              </div>

              <button
                onClick={handleProcess}
                disabled={!isValid || isProcessing || !isOnline}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all w-full sm:w-auto justify-center",
                  !isValid || isProcessing || !isOnline
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ⏳ Processing...
                  </>
                ) : (
                  <>
                    Process Task
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
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-green-500" />
              Structured Output
              {tasks.length > 0 && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold ml-2">
                  {tasks.length} tasks found
                </span>
              )}
            </h2>
            
            {tasks.length > 0 && !isProcessing && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 mr-2 border-r border-gray-200 pr-3">
                  <button onClick={undo} disabled={!canUndo} className={cn("p-1.5 rounded-md transition-colors", canUndo ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed")} title="Undo (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
                  <button onClick={redo} disabled={!canRedo} className={cn("p-1.5 rounded-md transition-colors", canRedo ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed")} title="Redo (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
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

          <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col relative">
            {isProcessing && streamingContent ? (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="markdown-body opacity-80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent + ' ▌'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium animate-pulse">Analyzing and structuring tasks...</p>
              </div>
            ) : error ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-red-50/30">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-red-600 font-medium mb-4 max-w-md">{error}</p>
                <button 
                  onClick={handleProcess}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Processing
                </button>
              </div>
            ) : tasks.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                <div className="flex justify-between items-center mb-3 px-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 font-medium flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort by:</span>
                    <button onClick={() => handleSort('priority')} className={cn("font-medium hover:text-blue-600 transition-colors", sortConfig?.key === 'priority' ? "text-blue-600" : "text-gray-600")}>Priority {sortConfig?.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    <button onClick={() => handleSort('dueDate')} className={cn("font-medium hover:text-blue-600 transition-colors", sortConfig?.key === 'dueDate' ? "text-blue-600" : "text-gray-600")}>Due Date {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    <button onClick={() => handleSort('suggestedList')} className={cn("font-medium hover:text-blue-600 transition-colors", sortConfig?.key === 'suggestedList' ? "text-blue-600" : "text-gray-600")}>List {sortConfig?.key === 'suggestedList' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                  </div>
                  <button 
                    onClick={handleToggleAll} 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
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
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50/50">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 shadow-inner">
                  <CheckSquare className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-center max-w-sm">
                  Your structured Google Task will appear here. Enter some text or upload an image, then click "Process Task" to begin.
                </p>
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
