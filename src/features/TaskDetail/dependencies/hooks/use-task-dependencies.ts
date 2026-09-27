import { useQuery } from "@tanstack/react-query";

import { getTaskDependencies } from "@/services/dependency.service";

/** Both dependency lists of a task, straight from the Query cache (no store). */
export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ["dependencies", taskId],
    queryFn: ({ signal }) => getTaskDependencies(taskId, signal),
    enabled: !!taskId,
  });
}
