import { httpClient } from "@/lib/http-client";
import type { ITask } from "@/types";

export const getTasks = () => {
  return httpClient.get<ITask[]>('/tasks');
}

export const getTaskByTicketId = (ticketId: string) => {
  return httpClient.get<ITask>(`/tasks/by-ticket/${ticketId}`);
}

export const createTask = (task: ITask) => {
  return httpClient.post<ITask>('/tasks', task);
}

export const updateTask = (id: string, task: Partial<ITask>) => {
  return httpClient.patch<ITask>(`/tasks/${id}`, task);
}

export const moveTaskToColumn = (id: string, columnId: number, position: number) => {
  return httpClient.patch<ITask>(`/tasks/${id}/move`, { column_id: columnId, position });
}

export const reorderTask = (id: string, position: number) => {
  return httpClient.patch<ITask>(`/tasks/${id}/reorder`, { position });
}

export const updateTaskAssignees = (id: string, assignee_ids: string[]) => {
  return httpClient.patch<ITask>(`/tasks/${id}`, { assignee_ids });
}
