import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task } from '../components/TaskCard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTaskDetails(rawContent: string) {
  const timeMatch = rawContent.match(/⏰ \*\*Time:\*\*\s*([^\n]+)/);
  const durationMatch = rawContent.match(/⏱️ \*\*Duration Estimate:\*\*\s*([^\n]+)/);
  const tagsMatch = rawContent.match(/\*\*🏷️ Tags \/ Categories:\*\*\n➖\s*([^\n]+)/);
  const objectiveMatch = rawContent.match(/\*\*🎯 Objective:\*\*\n➖\s*([^\n]+)/);

  return {
    time: timeMatch ? timeMatch[1].trim() : '',
    duration: durationMatch ? durationMatch[1].trim() : '',
    tags: tagsMatch ? tagsMatch[1].trim() : '',
    objective: objectiveMatch ? objectiveMatch[1].trim() : ''
  };
}

export function generateCSV(tasks: Task[]) {
  const headers = ['Title', 'Due Date', 'Due Time', 'Priority', 'Suggested List', 'Duration Estimate', 'Tags', 'Notes Summary'];
  
  const escapeCSV = (str: string) => {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = tasks.map(task => {
    const details = extractTaskDetails(task.rawContent);
    return [
      escapeCSV(task.title),
      escapeCSV(task.dueDate),
      escapeCSV(details.time),
      escapeCSV(task.priority),
      escapeCSV(task.suggestedList || 'Personal'),
      escapeCSV(details.duration),
      escapeCSV(details.tags),
      escapeCSV(details.objective)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generatePlainText(tasks: Task[]) {
  return tasks.map((task, index) => {
    const details = extractTaskDetails(task.rawContent);
    const priorityMap: Record<string, string> = {
      'P0': 'Critical',
      'P1': 'High',
      'P2': 'Medium',
      'P3': 'Low'
    };
    const priorityLabel = priorityMap[task.priority] || task.priority;
    
    let timeStr = details.time ? ` at ${details.time}` : '';
    let dueStr = task.dueDate ? `Due: ${task.dueDate}${timeStr} | ` : '';
    
    return `${index + 1}. ${task.title}\n   ${dueStr}Priority: ${priorityLabel} | List: ${task.suggestedList || 'Personal'}`;
  }).join('\n\n');
}
