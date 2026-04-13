import { describe, it, expect } from 'vitest';
import { parseTasks, serializeTask } from './taskEngine';
import { Task } from '../components/TaskCard';

describe('Task Engine', () => {
  const mockMarkdown = `## ✅ GOOGLE TASK OUTPUT
### 📌 TASK HEADER (Title)
Submit Expense Report

### 📊 PRIORITY & STATUS
Priority: 🟠 **P1 — High**
Status: 📥 Queued for Processing

### 📅 DUE DATE & TIME
📆 **Date:** Tuesday, April 14, 2026
⏰ **Time:** 2:30 PM
due: 2026-04-14

### 📁 TARGET LIST
➖ **List Name:** Work

### 📝 TASK DESCRIPTION & NOTES
[Automatically structured from input context]
---`;

  describe('parseTasks', () => {
    it('should correctly parse a standard task block', () => {
      const tasks = parseTasks(mockMarkdown);
      expect(tasks).toHaveLength(1);
      const task = tasks[0];
      
      expect(task.title).toBe('Submit Expense Report');
      expect(task.priority).toBe('P1');
      expect(task.suggestedList).toBe('Work');
      expect(task.dueDate).toBe('2026-04-14');
      expect(task.dueTime).toBe('14:30');
    });

    it('should handle missing date and time gracefully', () => {
      const minimalMarkdown = `## ✅ GOOGLE TASK OUTPUT
### 📌 TASK HEADER (Title)
Minimal Task`;
      const tasks = parseTasks(minimalMarkdown);
      expect(tasks[0].dueDate).toBe('');
      expect(tasks[0].dueTime).toBe('');
    });

    it('should parse multiple tasks correctly', () => {
      const multiMarkdown = mockMarkdown + '\n\n' + mockMarkdown.replace('Submit Expense Report', 'Second Task');
      const tasks = parseTasks(multiMarkdown);
      expect(tasks).toHaveLength(2);
      expect(tasks[1].title).toBe('Second Task');
    });
  });

  describe('serializeTask', () => {
    it('should reconstruct markdown from a task object', () => {
      const task: Task = {
        id: 'test-1',
        title: 'Reconstructed Task',
        priority: 'P0',
        suggestedList: 'Shopping',
        dueDate: '2026-12-25',
        dueTime: '09:00',
        rawContent: '',
        isSelected: false,
        isEdited: true
      };

      const markdown = serializeTask(task);
      expect(markdown).toContain('### 📌 TASK HEADER (Title)\nReconstructed Task');
      expect(markdown).toContain('Priority: 🔴 **P0 — Critical**');
      expect(markdown).toContain('due: 2026-12-25');
      expect(markdown).toContain('⏰ **Time:** 9:00 AM');
      expect(markdown).toContain('➖ **List Name:** Shopping');
    });
  });
});
