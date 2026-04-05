export const TaskActivityAction = {
  TASK_CREATED: 'task_created',
  TASK_TITLE_UPDATED: 'task_title_updated',
  TASK_DESCRIPTION_UPDATED: 'task_description_updated',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_PRIORITY_CHANGED: 'task_priority_changed',
  TASK_DUE_DATE_CHANGED: 'task_due_date_changed',
  TASK_ASSIGNEE_ADDED: 'task_assignee_added',
  TASK_ASSIGNEE_REMOVED: 'task_assignee_removed',
  TASK_LABEL_ADDED: 'task_label_added',
  TASK_LABEL_REMOVED: 'task_label_removed',
  TASK_MOVED: 'task_moved',
  TASK_REORDERED: 'task_reordered',
} as const;

export type TaskActivityAction = (typeof TaskActivityAction)[keyof typeof TaskActivityAction];

interface FieldChangePayload {
  from: string;
  to: string;
}

interface DueDateChangePayload {
  from: string | null;
  to: string | null;
}

interface AssigneeChangePayload {
  users: {
    user_id: string;
    full_name: string;
  }[];
}

interface LabelChangePayload {
  labels: {
    label_id: number;
    label_name: string;
    color: string;
  }[];
}

interface TaskMovedPayload {
  from_column_id: number;
  to_column_id: number;
  position: number;
}

interface TaskReorderedPayload {
  position: number;
}

type ActivityPayload =
  | Record<string, never>
  | FieldChangePayload
  | DueDateChangePayload
  | AssigneeChangePayload
  | LabelChangePayload
  | TaskMovedPayload
  | TaskReorderedPayload;

interface IActivity {
  id: string;
  action: TaskActivityAction;
  payload: ActivityPayload;
  actor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

interface IActivityQueryParams {
  page?: number;
  limit?: number;
  action?: TaskActivityAction;
}

export type {
  IActivity,
  IActivityQueryParams,
  ActivityPayload,
  FieldChangePayload,
  DueDateChangePayload,
  AssigneeChangePayload,
  LabelChangePayload,
  TaskMovedPayload,
  TaskReorderedPayload,
};
