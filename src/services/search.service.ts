import { httpClient } from "@/lib/http-client";
import type { IResponse, ITaskSearchHit } from "@/types";

/**
 * Cross-project task search (JSP-38); the server scopes results to the caller's
 * memberships. Named apart from KanbanBoard/search.ts's client-side `searchTasks`.
 */
export const searchTasksAllProjects = (q: string, page: number, limit: number, signal?: AbortSignal) => {
  const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  return httpClient.get<IResponse<ITaskSearchHit[]>>(`/search/tasks?${params}`, signal);
};
