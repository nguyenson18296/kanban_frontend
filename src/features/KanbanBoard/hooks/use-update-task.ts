import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTask } from "@/services/task.service";
import { toastError } from "@/lib/toast-error";
import type { ITask } from "@/types";

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<ITask> }) => updateTask(id, task),
    onError: (error) => {
      toastError(error, "Couldn't save your changes.");
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['activities', variables.id] });
    },
  });
}
