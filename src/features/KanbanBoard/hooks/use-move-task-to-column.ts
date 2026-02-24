import { useMutation, useQueryClient } from "@tanstack/react-query";

import { moveTaskToColumn } from "@/services/task.service";

export const useMoveTaskToColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, columnId, position }: { id: string; columnId: number; position: number }) => moveTaskToColumn(id, columnId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
