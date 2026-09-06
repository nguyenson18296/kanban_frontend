import { queryOptions, useQuery } from "@tanstack/react-query";

import { getMyProjects } from "@/services/project.service";

/** Single source of truth for the projects query (the caller's own projects) —
 * also consumed by the /projects redirect route via `queryClient.ensureQueryData`. */
export const projectsQueryOptions = queryOptions({
  queryKey: ["projects"],
  queryFn: async ({ signal }) => {
    const response = await getMyProjects(signal);
    // A 200 with success: false must surface as the error state, not an empty list.
    if (!response.success) throw new Error("Failed to load projects");
    return response.data;
  },
});

export const useGetProjects = () => {
  return useQuery(projectsQueryOptions);
};
