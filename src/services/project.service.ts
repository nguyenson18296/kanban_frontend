import { httpClient } from "@/lib/http-client";
import type { IMyProjectsResponse, IProjectMember, IProjectMembersResponse, ProjectRole } from "@/types";

export const getMyProjects = (signal?: AbortSignal) => {
  return httpClient.get<IMyProjectsResponse>("/users/me/projects", signal);
};

export const getProjectMembers = (projectId: string, signal?: AbortSignal) => {
  return httpClient.get<IProjectMembersResponse>(`/projects/${projectId}/members`, signal);
};

export const updateMemberRole = (projectId: string, userId: string, role: ProjectRole) => {
  return httpClient.patch<IProjectMember>(`/projects/${projectId}/members/${userId}`, { role });
};

/** JAV-15: bulk removal + self-leave; 204 on success, 409 when it would leave zero owners. */
export const removeProjectMembers = (projectId: string, userIds: string[]) => {
  return httpClient.delete<void>(`/projects/${projectId}/members`, { user_ids: userIds });
};
