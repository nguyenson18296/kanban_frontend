import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTaskLabels } from "@/services/task.service";

export const useUpdateTaskLabels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, label_ids }: { id: string; label_ids: string[] }) => updateTaskLabels(id, label_ids),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
