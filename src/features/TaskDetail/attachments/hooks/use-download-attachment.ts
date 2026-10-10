import { useMutation } from "@tanstack/react-query";

import { getAttachmentDownload } from "@/services/attachment.service";
import { toastError } from "@/lib/toast-error";

interface DownloadAttachmentInput {
  taskId: string;
  attachmentId: string;
  fileName: string;
}

/**
 * Fetch a fresh signed URL (they expire in ~5 minutes, so one per click —
 * a mutation, never a cached query) and hand it to the browser as a download.
 */
export function useDownloadAttachment() {
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: DownloadAttachmentInput) =>
      getAttachmentDownload(taskId, attachmentId),
    onSuccess: ({ url }, { fileName }) => {
      // The storage URL is pre-authorized; the server sends the file as a
      // download under its stored name. No Authorization header must ride along.
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    },
    onError: (error) => toastError(error, "Failed to download attachment"),
  });
}
