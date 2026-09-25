import type { Priority } from './task.type';

/** String form — the board's `ITask.status` is numeric. */
type TaskSearchStatus = 'open' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

/** `role` is the job role, not the project membership. */
interface ISearchAssignee {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Numeric id, unlike `ILabel`'s string id. */
interface ISearchLabel {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/** One hit from `GET /search/tasks` — contract: `docs/api-contracts/task-search.md` in the backend repo. */
interface ITaskSearchHit {
  id: string;
  title: string;
  description: string | null;
  status: TaskSearchStatus;
  priority: Priority;
  position: number;
  ticket_id: string | null;
  ticket_number: number | null;
  column_id: number;
  team_id: number | null;
  assignees: ISearchAssignee[];
  labels: ISearchLabel[];
  due_date: string | null;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  /** Present for a subtask; omitted for a top-level task. */
  parent?: { id: string };
  project_id: string;
  /** HTML-escaped text with `<mark>` around matches — render via `snippetSegments`, never as raw HTML. */
  snippet: string;
}

export type { ISearchAssignee, ISearchLabel, ITaskSearchHit, TaskSearchStatus };
