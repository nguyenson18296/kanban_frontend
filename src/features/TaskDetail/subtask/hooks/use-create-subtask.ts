import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSubtask } from "@/services/task.service";
import type { ICreateTaskDto } from "@/types/task.type";

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtask }: { taskId: string; subtask: ICreateTaskDto }) => createSubtask(taskId, subtask),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
    },
  });
};
