import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "@/services/comment.service";

export const useCreateComment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createComment(taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });
}
