import type { IUser } from './user.type';

interface ICommentDto {
  content: string;
}

interface IComment {
  id: string;
  content: string;
  is_edited: boolean;
  task_id: string;
  author: Partial<IUser>;
  created_at: string;
  updated_at: string;
}

export type { ICommentDto, IComment };
