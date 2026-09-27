import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removeTaskDependencies } from "@/services/dependency.service";
import { toastError } from "@/lib/toast-error";
import type { ITaskDependencies } from "@/types";

import { dependencyEdge } from "../dependency-edge";
import type { DependencyEdgeInput } from "../dependency-edge";

interface RemoveContext {
  previous: ITaskDependencies | undefined;
}

/** Unlink two tasks. Optimistic: drop in onMutate, restore the snapshot on error. */
export function useRemoveDependency() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DependencyEdgeInput, RemoveContext>({
    mutationFn: (input) => {
      const { routeTaskId, blockerId } = dependencyEdge(input);
      return removeTaskDependencies(routeTaskId, [blockerId]);
    },
    onMutate: async ({ direction, currentTaskId, otherTaskId }) => {
      const key = ["dependencies", currentTaskId];
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<ITaskDependencies>(key);
      if (previous) {
        queryClient.setQueryData<ITaskDependencies>(key, {
          ...previous,
          [direction]: previous[direction].filter((task) => task.id !== otherTaskId),
        });
      }
      return { previous };
    },
    onError: (error, { currentTaskId }, context) => {
      // Only restore what onMutate actually wrote.
      if (context?.previous) {
        queryClient.setQueryData(["dependencies", currentTaskId], context.previous);
      }
      toastError(error, "Failed to remove dependency");
    },
    onSettled: (_result, _error, input) => {
      queryClient.invalidateQueries({ queryKey: ["dependencies", input.currentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["dependencies", input.otherTaskId] });
      // Activity is recorded on the blocked (route) task.
      queryClient.invalidateQueries({ queryKey: ["activities", dependencyEdge(input).routeTaskId] });
    },
  });
}
