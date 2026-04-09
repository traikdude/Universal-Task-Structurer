import React, { useState, useEffect } from 'react';
import { List, Plus, Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskList {
  id: string;
  title: string;
}

// Mocked lists for now
const MOCK_LISTS: TaskList[] = [
  { id: '1', title: '🧑 Personal' },
  { id: '2', title: '💼 Work' },
  { id: '3', title: '🛒 Shopping' },
];

interface TaskListSelectorProps {
  onSend: (listId: string) => void;
  isSending: boolean;
  selectedCount: number;
  totalCount: number;
  suggestedListTitle?: string;
}

export function TaskListSelector({ onSend, isSending, selectedCount, totalCount, suggestedListTitle }: TaskListSelectorProps) {
  const [lists, setLists] = useState<TaskList[]>(MOCK_LISTS);
  const [selectedListId, setSelectedListId] = useState<string>(lists[0].id);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (suggestedListTitle) {
      const match = lists.find(l => l.title.toLowerCase().includes(suggestedListTitle.toLowerCase()));
      if (match) {
        setSelectedListId(match.id);
      } else {
        // Default to Personal if no match
        const personalList = lists.find(l => l.title.toLowerCase().includes('personal'));
        if (personalList) {
          setSelectedListId(personalList.id);
        }
      }
    }
  }, [suggestedListTitle, lists]);

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const newList = { id: Date.now().toString(), title: newListName };
    setLists([...lists, newList]);
    setSelectedListId(newList.id);
    setIsCreating(false);
    setNewListName('');
  };

  const selectedList = lists.find(l => l.id === selectedListId);

  let buttonLabel = '📤 Send to Google Tasks';
  let isDisabled = isSending || isCreating || selectedCount === 0;

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
              className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <button onClick={handleCreateList} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Add</button>
            <button onClick={() => setIsCreating(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
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
            className="text-sm bg-transparent border-none outline-none font-medium text-gray-700 cursor-pointer"
          >
            {lists.map(list => (
              <option key={list.id} value={list.id}>{list.title}</option>
            ))}
            <option value="CREATE_NEW">➕ Create new list...</option>
          </select>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      <button
        onClick={() => onSend(selectedListId)}
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
