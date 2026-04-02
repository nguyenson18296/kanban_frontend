import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteComment } from "@/services/comment.service";

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  })
}
