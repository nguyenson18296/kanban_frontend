import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTask } from "@/services/task.service";
import type { ITask } from "@/types";

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<ITask> }) => updateTask(id, task),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
