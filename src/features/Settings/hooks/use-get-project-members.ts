import { useQuery } from "@tanstack/react-query";

import { getProjectMembers } from "@/services/project.service";

/** Members of one project, unwrapped from the response envelope. */
export function useGetProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) throw new Error("No active project selected");
      const response = await getProjectMembers(projectId, signal);
      // A 200 with success: false must surface as the error state, not an empty list.
      if (!response.success) throw new Error("Failed to load project members");
      return response.data;
    },
    enabled: !!projectId,
  });
}
