import React, { useState, useEffect } from 'react';
import { List, Plus, Send, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchTaskLists, createTaskList } from '../services/googleTasks';

interface TaskList {
  id: string;
  title: string;
}

interface TaskListSelectorProps {
  onSend: (listId: string, listTitle: string) => void;
  isSending: boolean;
  selectedCount: number;
  totalCount: number;
  suggestedListTitle?: string;
  accessToken: string | null;
}

export function TaskListSelector({ onSend, isSending, selectedCount, totalCount, suggestedListTitle, accessToken }: TaskListSelectorProps) {
  // '@default' is the reserved Google Tasks API ID for the primary task list
  const [lists, setLists] = useState<TaskList[]>([{ id: '@default', title: 'My Tasks' }]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      setIsLoadingLists(true);
      fetchTaskLists(accessToken)
        .then(realLists => {
          if (realLists.length > 0) {
            setLists(realLists);
            
            // Try to match the suggested list title from the AI to an existing user list
            if (suggestedListTitle) {
              const match = realLists.find(l => l.title.toLowerCase().includes(suggestedListTitle.toLowerCase()));
              if (match) {
                setSelectedListId(match.id);
                return;
              }
            }
            // If no match, default to the primary list (usually the first returned)
            setSelectedListId(realLists[0].id);
            setListError(null);
          }
        })
        .catch(err => {
          console.error("Failed to load real task lists:", err);
          setListError(err?.message || "Failed to load lists");
        })
        .finally(() => setIsLoadingLists(false));
    }
  }, [accessToken, suggestedListTitle]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    if (accessToken) {
      setIsLoadingLists(true);
      try {
        const newList = await createTaskList(accessToken, newListName);
        setLists(prev => [...prev, newList]);
        setSelectedListId(newList.id);
        setIsCreating(false);
        setNewListName('');
      } catch (err) {
        alert("Failed to create new list. Please check your connection.");
      } finally {
        setIsLoadingLists(false);
      }
    } else {
       alert("Please connect to Google Tasks first to manage real lists.");
       setIsCreating(false);
    }
  };

  let buttonLabel = '📤 Send to Google Tasks';
  let isDisabled = isSending || isCreating || selectedCount === 0 || isLoadingLists;

  if (totalCount > 0) {
    if (selectedCount === 0) {
      buttonLabel = 'Select tasks to send';
    } else if (selectedCount === totalCount) {
      buttonLabel = `📤 Send All to Google Tasks (${totalCount})`;
    } else {
      buttonLabel = `📤 Send Selected to Google Tasks (${selectedCount}/${totalCount})`;
    }
  }

  return (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 relative transition-all duration-300">
      {listError && (
        <div className="absolute top-12 right-0 bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-3 py-2 rounded-xl shadow-lg z-50 text-xs w-64">
          <strong>Cannot connect to Google Tasks:</strong> {listError}
        </div>
      )}
      <div className="flex items-center gap-2">
        <List className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        {isCreating ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name..."
              className="text-sm border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 outline-none focus:border-neon-blue dark:focus:border-neon-cyan w-32 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100 placeholder-slate-400"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              disabled={isLoadingLists}
            />
            <button onClick={handleCreateList} disabled={isLoadingLists} className="text-xs bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-neon-cyan px-2 py-1 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-200 dark:hover:bg-slate-700 transition-colors">
              {isLoadingLists ? <Loader2 className="w-3 h-3 animate-spin mx-1" /> : 'Add'}
            </button>
            <button onClick={() => setIsCreating(false)} disabled={isLoadingLists} className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          </div>
        ) : (
          <select
            value={selectedListId}
            onChange={(e) => {
              if (e.target.value === 'CREATE_NEW') {
                setIsCreating(true);
              } else {
                setSelectedListId(e.target.value);
              }
            }}
            disabled={isLoadingLists}
            className="text-sm bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50 max-w-[150px] truncate"
          >
            {isLoadingLists && <option className="dark:bg-slate-900">Loading your lists...</option>}
            {!isLoadingLists && lists.map(list => (
              <option key={list.id} title={list.title} value={list.id} className="dark:bg-slate-900 dark:text-slate-250">{list.title}</option>
            ))}
            {!isLoadingLists && <option value="CREATE_NEW" className="dark:bg-slate-900 dark:text-slate-250">➕ Create new list...</option>}
          </select>
        )}
      </div>

      <div className="w-px h-6 bg-slate-300 dark:bg-slate-800 mx-1"></div>

      <button
        onClick={() => {
          const selectedList = lists.find(l => l.id === selectedListId);
          onSend(selectedListId, selectedList?.title || selectedListId);
        }}
        disabled={isDisabled}
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95",
          isDisabled
            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800/30"
            : "bg-neon-blue dark:bg-gradient-to-r dark:from-neon-cyan dark:to-neon-blue text-white dark:text-slate-950 shadow-sm hover:opacity-90 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]"
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
