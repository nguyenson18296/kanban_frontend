import { httpClient } from "@/lib/http-client";
import type { ITask } from "@/types";

export const getTasks = () => {
  return httpClient.get<ITask[]>('/tasks');
}

export const createTask = (task: ITask) => {
  return httpClient.post<ITask>('/tasks', task);
}

export const updateTask = (id: string, task: Partial<ITask>) => {
  return httpClient.patch<ITask>(`/tasks/${id}`, task);
}
