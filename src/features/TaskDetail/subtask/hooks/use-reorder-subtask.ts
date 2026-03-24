import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorderSubtask } from "@/services/task.service";

export const useReorderSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtaskId, position }: { taskId: string; subtaskId: string; position: number }) =>
      reorderSubtask(taskId, subtaskId, position),
    onSettled: (_data, _error, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
    },
  });
};
