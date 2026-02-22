import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTask } from "@/services/task.service";
import type { ITask } from "@/types";

export const useUpdateTask = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Partial<ITask>) => updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
