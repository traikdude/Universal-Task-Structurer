const BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

export interface TaskList {
  id: string;
  title: string;
}

export const fetchTaskLists = async (accessToken: string): Promise<TaskList[]> => {
  const res = await fetch(`${BASE_URL}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch lists');
  const data = await res.json();
  return data.items || [];
};

export const createTaskList = async (accessToken: string, title: string): Promise<TaskList> => {
  const res = await fetch(`${BASE_URL}/users/@me/lists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
};

export const insertTask = async (accessToken: string, listId: string, task: any) => {
  // Try to parse out the due date if it exists
  let due = undefined;
  if (task.dueDate) {
    try {
      // Google Tasks requires ISO 8601 format, e.g. 2026-04-09T00:00:00.000Z
      const dateStr = task.dueDate.includes('T') ? task.dueDate : `${task.dueDate}T12:00:00.000Z`;
      due = new Date(dateStr).toISOString();
    } catch (e) {
      console.warn("Could not parse due date", task.dueDate);
    }
  }

  const payload = {
    title: task.title,
    notes: task.rawContent,
    due: due
  };

  const res = await fetch(`${BASE_URL}/lists/${listId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error('Failed to insert task');
  return res.json();
};
