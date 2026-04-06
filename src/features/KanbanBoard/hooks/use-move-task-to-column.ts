import { useMutation, useQueryClient } from "@tanstack/react-query";

import { moveTaskToColumn } from "@/services/task.service";

export const useMoveTaskToColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, columnId, position }: { id: string; columnId: number; position: number }) => moveTaskToColumn(id, columnId, position),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['activities', variables.id] });
    },
  });
}
