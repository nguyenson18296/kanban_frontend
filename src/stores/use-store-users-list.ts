import { create } from 'zustand';
import type { IUser } from '@/types';

interface IStoreUsersList {
  users: IUser[];
  setUsers: (users: IUser[]) => void;
}

export const useStoreUsersList = create<IStoreUsersList>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
}));
