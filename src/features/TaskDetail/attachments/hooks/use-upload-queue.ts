import { useEffect, useRef, useState } from "react";

import { serverMessage, toastError } from "@/lib/toast-error";
import { validateAttachmentFile } from "../file-rules";
import { useUploadAttachment } from "./use-upload-attachment";

type UploadStatus = "uploading" | "failed" | "rejected";

interface UploadQueueItem {
  localId: string;
  fileName: string;
  sizeBytes: number;
  status: UploadStatus;
  /** Fraction of bytes sent, 0..1. */
  progress: number;
  /** Why the item is `failed` (server/network) or `rejected` (local pre-check). */
  message?: string;
}

const NETWORK_FALLBACK_MESSAGE = "Check your connection and try again";

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Per-file upload queue for a task: validates locally, uploads in parallel
 * (one request per file, per the API contract), tracks progress, and keeps
 * failed items around for retry. Successful items dequeue only after the
 * attachment list has been refreshed, so a file never vanishes from the queue
 * before it appears in the list.
 */
export function useUploadQueue(taskId: string) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  // Files and abort controllers are not render state — only status/progress are.
  const inFlightRef = useRef(new Map<string, { file: File; controller: AbortController }>());
  // mutateAsync, not mutate with callbacks: react-query only fires
  // mutate-call-level callbacks for the LATEST call, which would drop
  // settlements of parallel uploads. The returned promise settles per call.
  const { mutateAsync: uploadMutation } = useUploadAttachment();

  // Uploads keep running after unmount (navigating away must not kill them),
  // but once the inline queue UI is gone a failure needs another channel.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const patchItem = (localId: string, patch: Partial<UploadQueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (localId: string) => {
    inFlightRef.current.delete(localId);
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const startUpload = (localId: string, file: File) => {
    const controller = new AbortController();
    inFlightRef.current.set(localId, { file, controller });
    uploadMutation({
      taskId,
      file,
      signal: controller.signal,
      onProgress: (loaded, total) => {
        patchItem(localId, { progress: total > 0 ? loaded / total : 0 });
      },
    })
      // The list was already invalidated (and awaited) by the upload hook.
      .then(() => removeItem(localId))
      .catch((error: unknown) => {
        if (!mountedRef.current) {
          // Writes never fail silently — fall back to a toast post-unmount.
          if (!isAbort(error)) toastError(error, `Couldn't upload ${file.name}`);
          return;
        }
        if (isAbort(error)) {
          removeItem(localId);
          return;
        }
        patchItem(localId, {
          status: "failed",
          progress: 0,
          message: serverMessage(error) ?? NETWORK_FALLBACK_MESSAGE,
        });
      });
  };

  const addFiles = (files: Iterable<File>) => {
    for (const file of files) {
      const localId = crypto.randomUUID();
      const rejection = validateAttachmentFile(file);
      const item: UploadQueueItem = {
        localId,
        fileName: file.name,
        sizeBytes: file.size,
        status: rejection ? "rejected" : "uploading",
        progress: 0,
        message: rejection ?? undefined,
      };
      setItems((prev) => [...prev, item]);
      if (!rejection) startUpload(localId, file);
    }
  };

  /**
   * Re-send a failed item's file. The hook owns the state machine: rejected
   * items have nothing to retry, and retrying an item that is still uploading
   * would post a duplicate attachment — guard here, not just in the markup.
   */
  const retryUpload = (localId: string) => {
    const entry = inFlightRef.current.get(localId);
    const item = items.find((queued) => queued.localId === localId);
    if (!entry || item?.status !== "failed") return;
    patchItem(localId, { status: "uploading", progress: 0, message: undefined });
    startUpload(localId, entry.file);
  };

  const cancelUpload = (localId: string) => {
    inFlightRef.current.get(localId)?.controller.abort();
  };

  const dismissUpload = (localId: string) => {
    // No-op for settled uploads; stops the XHR if one is somehow in flight.
    inFlightRef.current.get(localId)?.controller.abort();
    removeItem(localId);
  };

  const cancelAll = () => {
    for (const item of items) {
      if (item.status === "uploading") cancelUpload(item.localId);
    }
  };

  const uploadingCount = items.filter((item) => item.status === "uploading").length;

  return { items, addFiles, retryUpload, cancelUpload, dismissUpload, cancelAll, uploadingCount };
}

export type { UploadQueueItem };
