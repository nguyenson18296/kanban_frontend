import type { ILabel } from './label.type';
import type { IUser } from './user.type';

type TAssignee = Pick<IUser, 'id' | 'full_name' | 'avatar_url'>;

type Priority = "no_priority" | "urgent" | "high" | "medium" | "low";

interface ITask {
  id: string;
  column_id: number;
  title: string;
  description: string;
  status: number;
  priority: Priority;
  position: number;
  ticket_id: string;
  labels: ILabel[];
  assignees: TAssignee[];
  due_date: string | null;
  creator: IUser;
  created_at: string;
  updated_at: string;
  parent: {
    id: string;
    column_id: number;
    title: string;
    ticket_id: string;
  } | null;
}

interface ICreateTaskDto {
  title: string;
  description: string;
  status: "open" | "in_progress" | "in_review" | "done" | "cancelled";
  priority: Priority;
  column_id: number;
  position: number;
  team_id: number;
  due_date: string | null;
  assignee_ids: string[];
  label_ids: string[];
}

export type { TAssignee, ITask, Priority, ICreateTaskDto };
