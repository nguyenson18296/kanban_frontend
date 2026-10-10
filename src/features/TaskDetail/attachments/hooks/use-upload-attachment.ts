import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadTaskAttachment } from "@/services/attachment.service";
import type { UploadOptions } from "@/lib/http-client";

interface UploadAttachmentInput extends UploadOptions {
  taskId: string;
  file: File;
}

/**
 * Upload one file to a task. No toast on error — the caller (the upload
 * queue) renders failures inline next to the file, with a retry.
 * Invalidation runs (and is awaited) before call-level callbacks, so a queue
 * item is only dequeued once the refreshed list already contains it.
 */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, file, onProgress, signal }: UploadAttachmentInput) =>
      uploadTaskAttachment(taskId, file, { onProgress, signal }),
    onSuccess: (_attachment, { taskId }) =>
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] }),
  });
}
