import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskAssignees } from "@/services/task.service";
import { toastError } from "@/lib/toast-error";
import {
  addSubscribersToCache,
  makeSubscriber,
  restoreSubscribers,
  snapshotSubscribers,
  subscribersKey,
} from "@/lib/subscriber-cache";
import type { ISubscriberListResponse, TAssignee } from "@/types";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

interface UpdateAssigneesVariables {
  id: string;
  assignee_ids: string[];
  previousAssignees: TAssignee[];
  // Full next assignee list, so newly-added members can be optimistically
  // added to the subscriber list (each new assignee is auto-subscribed).
  assignees: TAssignee[];
}

export const useUpdateAssignees = () => {
  const queryClient = useQueryClient();
  const updateStoreAssignees = useStoreKanbanBoard((s) => s.updateTaskAssignees);

  return useMutation<
    Awaited<ReturnType<typeof updateTaskAssignees>>,
    Error,
    UpdateAssigneesVariables,
    { previousSubscribers: ISubscriberListResponse | undefined }
  >({
    mutationFn: ({ id, assignee_ids }) => updateTaskAssignees(id, assignee_ids),
    onMutate: async ({ id, assignees, previousAssignees }) => {
      await queryClient.cancelQueries({ queryKey: subscribersKey(id) }); // 1. stop any in-flight GET /subscribers
      const previousSubscribers = snapshotSubscribers(queryClient, id); // 2. snapshot the true pre-mutation cache

      // Only additions subscribe; removing an assignee does NOT unsubscribe them.
      const prevIds = new Set(previousAssignees.map((a) => a.id));
      const now = new Date().toISOString();
      const added = assignees.filter((a) => !prevIds.has(a.id));
      addSubscribersToCache(
        queryClient,
        id,
        added.map((a) => makeSubscriber(a, "assigned", now)),
      ); // 3. write the optimistic value

      return { previousSubscribers };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['activities', variables.id] });
      // Assignees are auto-subscribed server-side (incl. self-assignment).
      queryClient.invalidateQueries({ queryKey: ['subscription', variables.id] });
      queryClient.invalidateQueries({ queryKey: subscribersKey(variables.id) });
    },
    onError: (error, variables, context) => {
      // Revert optimistic updates on failure, then surface the error.
      updateStoreAssignees(variables.id, variables.previousAssignees);
      restoreSubscribers(queryClient, variables.id, context?.previousSubscribers);
      toastError(error, "Couldn't update assignees.");
    },
  });
}
