import type { IUser } from './user.type';

interface IProject {
  id: string;
  name: string;
  tag: string;
  ticket_counter: number;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator: IUser;
}

export type { IProject };
