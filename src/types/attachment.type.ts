/**
 * Task attachments (JSP-41), mirroring the backend task-attachments contract.
 * Fields are snake_case like every API shape. The uploader payload carries no
 * team fields, so it is narrower than `IUser` on purpose.
 */

interface IAttachmentUploader {
  id: string;
  email: string;
  full_name: string;
  /** Job role (e.g. "backend_developer"), not the project membership role. */
  role: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ITaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  /** Detected by the server from the file bytes — the sent type is ignored. */
  content_type: string;
  size_bytes: number;
  /** null once the uploader's account is deleted. */
  uploaded_by: IAttachmentUploader | null;
  created_at: string;
}

interface IAttachmentDownload {
  /** Signed storage URL, valid ~5 minutes; open without an Authorization header. */
  url: string;
  expires_at: string;
}

export type { IAttachmentDownload, IAttachmentUploader, ITaskAttachment };
