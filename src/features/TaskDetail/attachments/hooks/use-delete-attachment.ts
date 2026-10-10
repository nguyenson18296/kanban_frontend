import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteTaskAttachment } from "@/services/attachment.service";
import { toastError } from "@/lib/toast-error";

interface DeleteAttachmentInput {
  taskId: string;
  attachmentId: string;
}

/** Remove one attachment. Not optimistic — the row shows a busy state until the list refreshes. */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, attachmentId }: DeleteAttachmentInput) =>
      deleteTaskAttachment(taskId, attachmentId),
    onSuccess: (_result, { taskId }) =>
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] }),
    onError: (error) => toastError(error, "Failed to delete attachment"),
  });
}
