import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderTask } from "@/services/task.service";

export const useReorderTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) => reorderTask(id, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
