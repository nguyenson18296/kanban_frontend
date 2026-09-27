import { httpClient } from "@/lib/http-client";
import type { ITaskDependencies } from "@/types/dependency.type";

export const getTaskDependencies = (taskId: string, signal?: AbortSignal) => {
  return httpClient.get<ITaskDependencies>(`/tasks/${taskId}/dependencies`, signal);
};

export const addTaskDependencies = (taskId: string, blockedByIds: string[]) => {
  return httpClient.post<ITaskDependencies>(`/tasks/${taskId}/dependencies`, {
    blocked_by_ids: blockedByIds,
  });
};

// The backend requires the JSON body (and Content-Type) on DELETE too.
export const removeTaskDependencies = (taskId: string, blockedByIds: string[]) => {
  return httpClient.delete<void>(`/tasks/${taskId}/dependencies`, {
    blocked_by_ids: blockedByIds,
  });
};
