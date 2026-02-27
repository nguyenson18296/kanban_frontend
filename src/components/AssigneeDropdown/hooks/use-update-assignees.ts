import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskAssignees } from "@/services/task.service";
import type { TAssignee } from "@/types";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

interface UpdateAssigneesVariables {
  id: string;
  assignee_ids: string[];
  previousAssignees: TAssignee[];
}

export const useUpdateAssignees = () => {
  const queryClient = useQueryClient();
  const updateStoreAssignees = useStoreKanbanBoard((s) => s.updateTaskAssignees);

  return useMutation({
    mutationFn: ({ id, assignee_ids }: UpdateAssigneesVariables) =>
      updateTaskAssignees(id, assignee_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
    onError: (_error, variables) => {
      // Revert optimistic update on failure
      updateStoreAssignees(variables.id, variables.previousAssignees);
    },
  });
}
