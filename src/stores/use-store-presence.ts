import { create } from "zustand";
import type { IPresenceState, IPresenceUpdate } from "@/types";

export interface PresenceEntry {
  isOnline: boolean;
  connectionCount: number;
  lastChangedAt: string | null;
}

interface IStorePresence {
  byUserId: Record<string, PresenceEntry | undefined>;
  // Refcount per userId. Components increment on mount via registerUsers
  // and decrement on unmount. Anything with count > 0 is "visible" and
  // is included in reconnect refetches.
  refCounts: Record<string, number>;

  registerUsers: (userIds: string[]) => void;
  unregisterUsers: (userIds: string[]) => void;
  getVisibleUserIds: () => string[];

  setSnapshot: (items: IPresenceState[]) => void;
  applyUpdate: (update: IPresenceUpdate) => void;
  reset: () => void;
}

export const useStorePresence = create<IStorePresence>((set, get) => ({
  byUserId: {},
  refCounts: {},

  registerUsers: (userIds) =>
    set((state) => {
      if (userIds.length === 0) return state;
      const next = { ...state.refCounts };
      for (const id of userIds) {
        next[id] = (next[id] ?? 0) + 1;
      }
      return { refCounts: next };
    }),

  unregisterUsers: (userIds) =>
    set((state) => {
      if (userIds.length === 0) return state;
      const next = { ...state.refCounts };
      for (const id of userIds) {
        const v = (next[id] ?? 0) - 1;
        if (v <= 0) delete next[id];
        else next[id] = v;
      }
      return { refCounts: next };
    }),

  getVisibleUserIds: () => Object.keys(get().refCounts),

  setSnapshot: (items) =>
    set((state) => {
      const next = { ...state.byUserId };
      for (const item of items) {
        next[item.userId] = {
          isOnline: item.isOnline,
          connectionCount: item.connectionCount,
          lastChangedAt: item.lastChangedAt,
        };
      }
      return { byUserId: next };
    }),

  applyUpdate: (update) =>
    set((state) => ({
      byUserId: {
        ...state.byUserId,
        [update.userId]: {
          isOnline: update.isOnline,
          connectionCount: update.connectionCount,
          // Live events carry the transition timestamp — use it as
          // lastChangedAt so the store stays consistent with REST.
          lastChangedAt: update.timestamp,
        },
      },
    })),

  reset: () => set({ byUserId: {}, refCounts: {} }),
}));
