import { httpClient } from "@/lib/http-client";
import type { UploadOptions } from "@/lib/http-client";
import type { IAttachmentDownload, IResponse, ITaskAttachment } from "@/types";

export const getTaskAttachments = (
  taskId: string,
  page: number,
  limit: number,
  signal?: AbortSignal,
) => {
  return httpClient.get<IResponse<ITaskAttachment[]>>(
    `/tasks/${taskId}/attachments?page=${page}&limit=${limit}`,
    signal,
  );
};

export const uploadTaskAttachment = (taskId: string, file: File, options?: UploadOptions) => {
  const form = new FormData();
  form.append("file", file);
  return httpClient.upload<ITaskAttachment>(`/tasks/${taskId}/attachments`, form, options);
};

/** The signed URL expires in ~5 minutes — request a fresh one per click, never cache it. */
export const getAttachmentDownload = (taskId: string, attachmentId: string) => {
  return httpClient.get<IAttachmentDownload>(
    `/tasks/${taskId}/attachments/${attachmentId}/download`,
  );
};

export const deleteTaskAttachment = (taskId: string, attachmentId: string) => {
  return httpClient.delete<void>(`/tasks/${taskId}/attachments/${attachmentId}`);
};
