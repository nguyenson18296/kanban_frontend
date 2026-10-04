/**
 * Client-side mirror of the server's upload rules (backend task-attachments
 * contract): pre-check size/type in the browser so most bad files never leave
 * it. The server re-checks everything (and detects the real type from bytes),
 * so these messages intentionally match its wording.
 */

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const TYPE_REJECTED_MESSAGE =
  "File type is not allowed. Allowed types: PNG, JPEG, GIF, WebP, PDF, Markdown.";

const ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "md",
  "markdown",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/markdown",
]);

function fileExtension(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

/**
 * Returns a user-facing rejection message, or null when the file may be
 * uploaded. Checks follow the server's order: empty, size, then type.
 */
function validateAttachmentFile(file: File): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "File is too large. The maximum size is 10 MB.";
  }
  const extension = fileExtension(file.name);
  if (extension) {
    return ALLOWED_EXTENSIONS.has(extension) ? null : TYPE_REJECTED_MESSAGE;
  }
  // No extension — the declared MIME type is the only hint the browser has.
  const mime = file.type.split(";")[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.has(mime) ? null : TYPE_REJECTED_MESSAGE;
}

/** Human-readable size in B/KB/MB with at most one decimal (482133 → "470.8 KB"). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const inKb = bytes / 1024;
  if (inKb < 1024) return `${trimDecimal(inKb)} KB`;
  return `${trimDecimal(inKb / 1024)} MB`;
}

function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

/** Short uppercase badge for a file row ("PNG", "PDF", "MD"; "FILE" when unknown). */
function attachmentExtLabel(fileName: string): string {
  const extension = fileExtension(fileName);
  if (!extension) return "FILE";
  if (extension === "markdown") return "MD";
  return extension.toUpperCase();
}

export { MAX_ATTACHMENT_BYTES, attachmentExtLabel, formatBytes, validateAttachmentFile };
