import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorderSubtask } from "@/services/task.service";
import { toastError } from "@/lib/toast-error";

export const useReorderSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtaskId, position }: { taskId: string; subtaskId: string; position: number }) =>
      reorderSubtask(taskId, subtaskId, position),
    onError: (error) => {
      toastError(error, "Couldn't reorder the subtask.");
    },
    onSettled: (_data, _error, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
    },
  });
};
