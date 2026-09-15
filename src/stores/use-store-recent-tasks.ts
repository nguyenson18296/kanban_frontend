import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT_TASKS = 5;
// localStorage is read synchronously at startup — bound the payload by pruning
// projects the user hasn't touched recently. Object key insertion order doubles
// as project recency (the touched project is always re-inserted last).
const MAX_RECENT_PROJECTS = 10;

interface IStoreRecentTasks {
  /** projectId -> ticket ids of recently opened tasks, newest first. */
  recentByProject: Record<string, string[]>;
  recordRecentTask: (projectId: string, ticketId: string) => void;
}

/**
 * Recently opened tasks, shown in board search before the user types (JAV-35).
 * Persisted so recents survive a reload; holds only project/ticket ids —
 * no tokens/PII. Entries are resolved against the live board when rendered,
 * so stale ids (deleted tasks) simply drop out.
 */
export const useStoreRecentTasks = create<IStoreRecentTasks>()(
  persist(
    (set) => ({
      recentByProject: {},
      // Always build new objects/arrays so referential equality drives re-renders.
      recordRecentTask: (projectId, ticketId) =>
        set((state) => {
          const current = state.recentByProject[projectId] ?? [];
          const next = [ticketId, ...current.filter((id) => id !== ticketId)].slice(
            0,
            MAX_RECENT_TASKS,
          );
          const others = Object.entries(state.recentByProject).filter(
            ([key]) => key !== projectId,
          );
          const kept = others.slice(-(MAX_RECENT_PROJECTS - 1));
          return { recentByProject: { ...Object.fromEntries(kept), [projectId]: next } };
        }),
    }),
    {
      name: 'recent-tasks-store',
      // v2 introduced project pruning; the persisted shape is unchanged, so the
      // migration keeps v1 payloads as-is (actions come from code, not storage).
      version: 2,
      migrate: (persisted) => persisted as IStoreRecentTasks,
    },
  ),
);
