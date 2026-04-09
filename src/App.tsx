import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Loader2, Copy, Check, ArrowRight, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { processTaskStream } from './services/gemini';
import { cn } from './lib/utils';
import { ExampleChips } from './components/ExampleChips';
import { TaskListSelector } from './components/TaskListSelector';
import { ImageUpload } from './components/ImageUpload';
import { TaskCard, Task } from './components/TaskCard';
import { HistoryPanel, HistoryEntry } from './components/HistoryPanel';
import { ExportDropdown } from './components/ExportDropdown';
import { generateCSV, generatePlainText } from './lib/utils';

const MIN_CHARS = 15;
const MAX_CHARS = 6000;

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

  // Confetti effect
  const prevIsProcessing = useRef(isProcessing);
  useEffect(() => {
    if (prevIsProcessing.current && !isProcessing && tasks.length > 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#f97316', '#22c55e'] // teal, orange, green
        });
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#14b8a6', '#f97316', '#22c55e']
        });
      }, 250);
    }
    prevIsProcessing.current = isProcessing;
  }, [isProcessing, tasks.length]);

  const handleProcess = async () => {
    if (!isOnline) {
      setError('You are currently offline. Processing will resume once your connection is restored.');
      return;
    }
    if (input.length < MIN_CHARS && !imageBase64) return;
    if (input === lastProcessedInput && !imageBase64) {
      const confirm = window.confirm("This looks identical to your last input. Would you like to reprocess it?");
      if (!confirm) return;
    }
    
    setIsProcessing(true);
    setError('');
    setTasks([]);
    setStreamingContent('');
    setSentSuccess(false);
    
    try {
      const result = await processTaskStream(
        input, 
        imageBase64 || undefined, 
        imageMimeType || undefined,
        (chunk) => {
          setStreamingContent(chunk);
        }
      );
      
      if (!result || result.trim() === '' || result.includes('No output generated')) {
        setError('No structured tasks were found. Try adding more context, action verbs, or dates to your input.');
      } else {
        const parsedTasks = parseTasks(result);
        setTasks(parsedTasks);
        setLastProcessedInput(input);
        
        // Add to history
        setHistory(prev => {
          const newEntry: HistoryEntry = {
            id: `history-${Date.now()}`,
            timestamp: Date.now(),
            input,
            imageBase64,
            imageMimeType,
            tasks: parsedTasks,
            rawOutput: result
          };
          const newHistory = [newEntry, ...prev];
          return newHistory.slice(0, 5); // Keep only last 5
        });
      }
    } catch (err) {
      setError('Gemini couldn\'t process your request right now. This might be a temporary issue—please try again in a moment.');
      console.error(err);
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

  const handleSendToTasks = async (listId: string) => {
    setIsSending(true);
    // Mocking API call to Google Tasks
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    }, 1500);
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
    setImageBase64(entry.imageBase64 || null);
    setImageMimeType(entry.imageMimeType || null);
  };

  const handleViewOutput = (entry: HistoryEntry) => {
    setTasks(entry.tasks);
    setInput(entry.input);
    setImageBase64(entry.imageBase64 || null);
    setImageMimeType(entry.imageMimeType || null);
    setLastProcessedInput(entry.input);
    setError('');
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const selectedCount = tasks.filter(t => t.isSelected).length;

  const inputLength = input.length;
  const isTooShort = inputLength > 0 && inputLength < MIN_CHARS && !imageBase64;
  const isTooLong = inputLength > MAX_CHARS;
  const isValid = (inputLength >= MIN_CHARS || imageBase64) && !isTooLong;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Universal Task Structurer</h1>
            <p className="text-sm text-gray-500">Transform any text or image into a structured Google Task</p>
          </div>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200">
            <WifiOff className="w-4 h-4" />
            Offline Mode
          </div>
        )}
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
              <ImageUpload 
                currentImage={imageBase64}
                onImageSelect={(base64, mime) => {
                  setImageBase64(base64);
                  setImageMimeType(mime);
                }}
                onImageRemove={() => {
                  setImageBase64(null);
                  setImageMimeType(null);
                }}
              />
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
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
                <TaskListSelector 
                  onSend={handleSendToTasks} 
                  isSending={isSending} 
                  selectedCount={selectedCount} 
                  totalCount={tasks.length} 
                  suggestedListTitle={tasks[0]?.suggestedList}
                />
                {sentSuccess && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Sent!</span>}
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
                <div className="flex justify-end mb-3 px-2">
                  <button 
                    onClick={handleToggleAll} 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {selectedCount === tasks.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="flex flex-col gap-4">
                  {tasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      totalTasks={tasks.length}
                      onUpdate={handleUpdateTask}
                      onDelete={handleDeleteTask}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
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
    </div>
  );
}
