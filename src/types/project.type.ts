import type { IUser } from './user.type';

interface IProject {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  creator?: IUser | null;
  created_at: string;
  updated_at: string;
}

export type { IProject };
