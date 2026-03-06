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
  ticket_id: string;
  labels: ILabel[];
  assignees: TAssignee[];
  creator: IUser;
  created_at: string;
  updated_at: string;
}

export type { TAssignee, ITask, Priority };