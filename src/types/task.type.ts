interface ITask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  ticket_id: string;
  tag: string;
  assignee_avatar: string;
  due_date: string;
  comments_count?: number;
  subtasks_done?: number;
  subtasks_total?: number;
  progress?: number;
  created_at: string;
  updated_at: string;
}

export type { ITask };