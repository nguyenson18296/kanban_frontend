import { useQuery } from "@tanstack/react-query";

import { getProjectMembers } from "@/services/project.service";
import type { IProjectMember } from "@/types";

/**
 * Stable, role-independent ordering. The API has no guaranteed ORDER BY, so an
 * updated row can come back in a different position after a role change —
 * sorting here keeps rows from jumping around on refetch.
 */
function byJoinDate(a: IProjectMember, b: IProjectMember): number {
  return (
    a.joined_at.localeCompare(b.joined_at) ||
    a.user.full_name.localeCompare(b.user.full_name) ||
    a.user.id.localeCompare(b.user.id)
  );
}

/** Members of one project, unwrapped from the response envelope. */
export function useGetProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) throw new Error("No active project selected");
      const response = await getProjectMembers(projectId, signal);
      // A 200 with success: false must surface as the error state, not an empty list.
      if (!response.success) throw new Error("Failed to load project members");
      return [...response.data].sort(byJoinDate);
    },
    enabled: !!projectId,
  });
}
