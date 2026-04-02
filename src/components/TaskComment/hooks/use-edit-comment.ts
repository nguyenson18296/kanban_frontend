import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateComment } from "@/services/comment.service";

export function useEditComment(commentId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: { content: string }) => updateComment(commentId, comment),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  })
}
