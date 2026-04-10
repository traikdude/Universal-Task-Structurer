/**
 * Google Tasks API service.
 *
 * Provides typed helpers for listing, creating, and inserting tasks
 * via the REST v1 API using an OAuth2 access token.
 */

const BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

// ── Types ──────────────────────────────────────────────────────

export interface TaskList {
  id: string;
  title: string;
}

export interface GoogleTaskPayload {
  title: string;
  notes?: string;
  due?: string;     // ISO 8601 date-time string
  status?: string;  // 'needsAction' | 'completed'
}

export interface InsertableTask {
  title: string;
  dueDate?: string;
  dueTime?: string;  // HH:mm format (24h), e.g. "14:30"
  rawContent?: string;
}

// ── Error helpers ──────────────────────────────────────────────

/**
 * Checks the response status and throws with the API error body
 * when the request fails. Returns a structured message so callers
 * can differentiate 401 (expired token) from other failures.
 */
async function assertOk(res: Response, context: string): Promise<void> {
  if (res.ok) return;

  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? JSON.stringify(body);
  } catch {
    detail = res.statusText;
  }

  const err = new Error(`[Google Tasks] ${context}: ${res.status} — ${detail}`);
  (err as any).status = res.status;
  throw err;
}

// ── API functions ──────────────────────────────────────────────

/**
 * Fetches all task lists for the authenticated user.
 */
export const fetchTaskLists = async (accessToken: string): Promise<TaskList[]> => {
  const res = await fetch(`${BASE_URL}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  await assertOk(res, 'Failed to fetch task lists');
  const data = await res.json();
  return data.items ?? [];
};

/**
 * Creates a new task list with the given title.
 */
export const createTaskList = async (accessToken: string, title: string): Promise<TaskList> => {
  const res = await fetch(`${BASE_URL}/users/@me/lists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title })
  });
  await assertOk(res, `Failed to create list "${title}"`);
  return res.json();
};

/**
 * Inserts a single task into the specified list.
 *
 * Converts the app's internal task shape into the Google Tasks API payload,
 * handling date and time normalization defensively.
 */
export const insertTask = async (
  accessToken: string,
  listId: string,
  task: InsertableTask
): Promise<any> => {
  // Compose ISO 8601 due date-time from the separate date and time fields
  let due: string | undefined;
  if (task.dueDate) {
    try {
      // If the user set a time, compose date + time; otherwise default to noon UTC
      const timePart = task.dueTime ? `${task.dueTime}:00` : '12:00:00';
      const dateStr = `${task.dueDate}T${timePart}.000Z`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        due = parsed.toISOString();
      }
    } catch {
      console.warn('[Google Tasks] Could not parse due date/time:', task.dueDate, task.dueTime);
    }
  }

  const payload: GoogleTaskPayload = {
    title: task.title,
    notes: task.rawContent,
    due,
  };

  const res = await fetch(`${BASE_URL}/lists/${listId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  await assertOk(res, `Failed to insert task "${task.title}"`);
  return res.json();
};
