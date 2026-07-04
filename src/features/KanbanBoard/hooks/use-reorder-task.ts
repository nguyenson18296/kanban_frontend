import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderTask } from "@/services/task.service";
import { toastError } from "@/lib/toast-error";

export const useReorderTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) => reorderTask(id, position),
    onError: (error) => {
      toastError(error, "Couldn't reorder the task.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
