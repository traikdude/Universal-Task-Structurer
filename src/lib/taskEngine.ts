import { Task } from '../components/TaskCard';

/**
 * Reconstructs the raw markdown block for a task from its object state.
 * Deterministic serialization ensuring state -> markdown integrity.
 */
export const serializeTask = (task: Task): string => {
  const priorityMap: Record<string, string> = {
    'P0': '🔴 **P0 — Critical**',
    'P1': '🟠 **P1 — High**',
    'P2': '🟡 **P2 — Medium**',
    'P3': '🟢 **P3 — Low**'
  };

  const priorityEmoji = priorityMap[task.priority] || priorityMap['P3'];
  
  let dateDisplay = 'Not specified';
  if (task.dueDate) {
    const dateObj = new Date(task.dueDate + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      dateDisplay = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }
  }

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
➖ **List Name:** ${task.suggestedList || 'My Tasks'}

### 📝 TASK DESCRIPTION & NOTES
[Automatically structured from input context]
---
`;
};

/**
 * Robustly parses a delimited AI response into separate Task objects.
 * Tolerant of casing and whitespace.
 */
export const parseTasks = (markdown: string): Task[] => {
  let taskBlocks = markdown.split(/(?=## ✅ GOOGLE TASK OUTPUT)/i).filter(t => t.trim().length > 0);
  
  if (taskBlocks.every(t => !t.includes('## ✅ GOOGLE TASK OUTPUT'))) {
    taskBlocks = [markdown];
  } else {
    taskBlocks = taskBlocks.filter(t => t.includes('## ✅ GOOGLE TASK OUTPUT'));
  }

  return taskBlocks.map((raw, index) => {
    const titleMatch = raw.match(/### 📌 TASK HEADER(?: \(Title\))?\n+([^\n]+)/);
    const priorityMatch = raw.match(/Priority:\s*(?:🔴|🟠|🟡|🟢)\s*\*\*(P[0-3])/i);
    const listMatch = raw.match(/➖ \*\*List Name:\*\*\s*([^\n]+)/i);
    const dateMatch = raw.match(/due:\s*(\d{4}-\d{2}-\d{2})/i);
    const timeMatch = raw.match(/⏰ \*\*Time:\*\*\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);

    let dueTime = '';
    if (timeMatch) {
      let [h, m] = timeMatch[1].split(':').map(Number);
      const isPM = timeMatch[2].toUpperCase() === 'PM';
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      dueTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    return {
      id: `task_${Date.now()}_${index}`,
      title: titleMatch ? titleMatch[1].trim() : 'Untitled Task',
      priority: (priorityMatch ? priorityMatch[1].toUpperCase() : 'P3') as any,
      suggestedList: listMatch ? listMatch[1].trim() : 'My Tasks',
      dueDate: dateMatch ? dateMatch[1] : '',
      dueTime: dueTime,
      rawContent: raw,
      isSelected: false,
      isEdited: false
    };
  });
};
