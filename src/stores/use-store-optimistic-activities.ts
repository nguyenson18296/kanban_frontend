import { create } from "zustand";
import type { IActivity, TaskActivityAction, ActivityPayload } from "@/types";
import { useStoreUser } from "./use-store-user";

interface OptimisticActivitiesStore {
  activities: Map<string, IActivity[]>;
  addActivity: (taskId: string, activity: IActivity) => void;
  clearForTask: (taskId: string) => void;
}

export const useStoreOptimisticActivities = create<OptimisticActivitiesStore>((set) => ({
  activities: new Map(),
  addActivity: (taskId, activity) =>
    set((state) => {
      const map = new Map(state.activities);
      const existing = map.get(taskId) ?? [];
      map.set(taskId, [...existing, activity]);
      return { activities: map };
    }),
  clearForTask: (taskId) =>
    set((state) => {
      const map = new Map(state.activities);
      map.delete(taskId);
      return { activities: map };
    }),
}));

export function getCurrentActor(): IActivity["actor"] {
  const user = useStoreUser.getState().user;
  return {
    id: user?.id ?? "",
    full_name: user?.full_name ?? "",
    avatar_url: user?.avatar_url ?? null,
  };
}

export function createOptimisticActivity(
  action: TaskActivityAction,
  payload: ActivityPayload,
  actor?: IActivity["actor"],
): IActivity {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    action,
    payload,
    actor: actor ?? getCurrentActor(),
    created_at: new Date().toISOString(),
  };
}
