import { httpClient } from "@/lib/http-client";
import type { IProject, IProjectMembersResponse } from "@/types";

export const getProjects = (signal?: AbortSignal) => {
  return httpClient.get<IProject[]>("/projects", signal);
};

export const getProjectMembers = (projectId: string, signal?: AbortSignal) => {
  return httpClient.get<IProjectMembersResponse>(`/projects/${projectId}/members`, signal);
};
