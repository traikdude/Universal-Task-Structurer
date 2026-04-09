import { useState, useCallback } from 'react';
import { Task } from '../components/TaskCard';

export function useTaskHistory(initialTasks: Task[]) {
  const [past, setPast] = useState<Task[][]>([]);
  const [present, setPresent] = useState<Task[]>(initialTasks);
  const [future, setFuture] = useState<Task[][]>([]);

  const set = useCallback((newPresent: Task[] | ((current: Task[]) => Task[])) => {
    setPresent(currentPresent => {
      const resolvedNewPresent = typeof newPresent === 'function' ? newPresent(currentPresent) : newPresent;
      
      if (currentPresent === resolvedNewPresent) {
        return currentPresent;
      }
      
      setPast(p => [...p, currentPresent]);
      setFuture([]);
      return resolvedNewPresent;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture(f => [present, ...f]);
    setPresent(previous);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast(p => [...p, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [future, present]);

  const reset = useCallback((newTasks: Task[]) => {
    setPast([]);
    setPresent(newTasks);
    setFuture([]);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };
}
