import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskLabels } from "@/services/task.service";
import { toastError } from "@/lib/toast-error";

export const useUpdateTaskLabels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, label_ids }: { id: string; label_ids: string[] }) => updateTaskLabels(id, label_ids),
    onError: (error) => {
      toastError(error, "Couldn't update labels.");
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['activities', variables.id] });
    },
  });
}
