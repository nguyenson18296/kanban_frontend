import { queryOptions, useQuery } from "@tanstack/react-query";

import { getProjects } from "@/services/project.service";

/** Single source of truth for the projects query — also consumed by the
 * /projects redirect route via `queryClient.ensureQueryData`. */
export const projectsQueryOptions = queryOptions({
  queryKey: ["projects"],
  queryFn: ({ signal }) => getProjects(signal),
});

export const useGetProjects = () => {
  return useQuery(projectsQueryOptions);
};
