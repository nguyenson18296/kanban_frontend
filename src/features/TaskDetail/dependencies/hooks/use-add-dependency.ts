import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addTaskDependencies } from "@/services/dependency.service";
import { toastError } from "@/lib/toast-error";
import type { ITaskDependencies } from "@/types";

import { dependencyEdge } from "../dependency-edge";
import type { DependencyEdgeInput } from "../dependency-edge";

/** Link two tasks. NOT optimistic: a 409 cycle is a normal outcome — no phantom entries. */
export function useAddDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DependencyEdgeInput) => {
      const { routeTaskId, blockerId } = dependencyEdge(input);
      return addTaskDependencies(routeTaskId, [blockerId]);
    },
    onSuccess: async (view: ITaskDependencies, input) => {
      const { routeTaskId, blockerId } = dependencyEdge(input);
      // Don't let a stale in-flight GET land after and overwrite the 201 view.
      await queryClient.cancelQueries({ queryKey: ["dependencies", routeTaskId] });
      queryClient.setQueryData(["dependencies", routeTaskId], view);
      queryClient.invalidateQueries({ queryKey: ["dependencies", blockerId] });
      // Activity is recorded on the blocked (route) task.
      queryClient.invalidateQueries({ queryKey: ["activities", routeTaskId] });
    },
    // The server's 409 message is user-presentable; toastError shows it as-is.
    onError: (error) => toastError(error, "Failed to add dependency"),
  });
}
