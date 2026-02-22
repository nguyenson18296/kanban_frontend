import type { ILabel } from './label.type';

interface IAssignee {
  id: string;
  full_name: string;
  avatar_url: string;
}

type Priority = "no_priority" | "urgent" | "high" | "medium" | "low";

interface ITask {
  id: string;
  title: string;
  description: string;
  status: number;
  priority: Priority;
  ticket_id: string;
  labels: ILabel[];
  assignees: IAssignee[];
  created_at: string;
  updated_at: string;
}

export type { ITask, Priority };