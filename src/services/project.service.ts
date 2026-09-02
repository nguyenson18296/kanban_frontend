import { httpClient } from "@/lib/http-client";
import type { IProject, IProjectMember, IProjectMembersResponse, ProjectRole } from "@/types";

export const getProjects = (signal?: AbortSignal) => {
  return httpClient.get<IProject[]>("/projects", signal);
};

export const getProjectMembers = (projectId: string, signal?: AbortSignal) => {
  return httpClient.get<IProjectMembersResponse>(`/projects/${projectId}/members`, signal);
};

export const updateMemberRole = (projectId: string, userId: string, role: ProjectRole) => {
  return httpClient.patch<IProjectMember>(`/projects/${projectId}/members/${userId}`, { role });
};
