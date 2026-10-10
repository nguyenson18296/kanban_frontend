import { useInfiniteQuery } from "@tanstack/react-query";

import { getTaskAttachments } from "@/services/attachment.service";
import type { ITaskAttachment } from "@/types";

export const ATTACHMENTS_PAGE_SIZE = 20;

/**
 * A task's attachments, cache-backed (no Zustand mirror), newest first.
 * Offset-paginated: an upload/delete between page fetches can shift a row onto
 * two pages, so rows are deduplicated by id to keep React keys unique.
 */
export function useTaskAttachments(taskId: string) {
  return useInfiniteQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: ({ pageParam, signal }) =>
      getTaskAttachments(taskId, pageParam, ATTACHMENTS_PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!taskId,
    select: (data) => {
      const seen = new Set<string>();
      const attachments: ITaskAttachment[] = [];
      for (const page of data.pages) {
        for (const attachment of page.data) {
          if (!seen.has(attachment.id)) {
            seen.add(attachment.id);
            attachments.push(attachment);
          }
        }
      }
      return { attachments, total: data.pages.at(-1)?.meta.total ?? 0 };
    },
  });
}
