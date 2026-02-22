import type { ITask } from './task.type';

interface IColumn {
  id: number;
  position: number;
  name: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  tasks: ITask[];
}

export type { IColumn };