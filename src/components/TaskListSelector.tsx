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
          }
        })
        .catch(err => console.error("Failed to load real task lists:", err))
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
    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <List className="w-4 h-4 text-gray-500" />
        {isCreating ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name..."
              className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 w-32 bg-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              disabled={isLoadingLists}
            />
            <button onClick={handleCreateList} disabled={isLoadingLists} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium disabled:opacity-50 hover:bg-blue-200 transition-colors">
              {isLoadingLists ? <Loader2 className="w-3 h-3 animate-spin mx-1" /> : 'Add'}
            </button>
            <button onClick={() => setIsCreating(false)} disabled={isLoadingLists} className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700">Cancel</button>
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
            className="text-sm bg-transparent border-none outline-none font-medium text-gray-700 cursor-pointer disabled:opacity-50 max-w-[150px] truncate"
          >
            {isLoadingLists && <option>Loading your lists...</option>}
            {!isLoadingLists && lists.map(list => (
              <option key={list.id} title={list.title} value={list.id}>{list.title}</option>
            ))}
            {!isLoadingLists && <option value="CREATE_NEW">➕ Create new list...</option>}
          </select>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      <button
        onClick={() => {
          const selectedList = lists.find(l => l.id === selectedListId);
          onSend(selectedListId, selectedList?.title || selectedListId);
        }}
        disabled={isDisabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          isDisabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
