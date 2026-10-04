import { useQuery } from "@tanstack/react-query";

import { getAttachmentDownload } from "@/services/attachment.service";

/** Keep comfortably under the server's ~5-minute signed-URL validity. */
const PREVIEW_URL_LIFETIME_MS = 4 * 60 * 1000;

/**
 * Signed URL for rendering an image attachment inline (`<img>` ignores the
 * download route's Content-Disposition). The URL expires server-side, so the
 * cache entry goes stale — and is dropped — before the signature does; a
 * remount past that point fetches a fresh one instead of reusing a dead URL.
 */
export function useAttachmentPreview(taskId: string, attachmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["attachment-preview", taskId, attachmentId],
    queryFn: () => getAttachmentDownload(taskId, attachmentId),
    enabled: enabled && !!attachmentId,
    staleTime: PREVIEW_URL_LIFETIME_MS,
    gcTime: PREVIEW_URL_LIFETIME_MS,
  });
}
