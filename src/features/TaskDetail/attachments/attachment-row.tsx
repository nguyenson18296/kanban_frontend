import { formatDistanceToNow } from "date-fns";
import { Download, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ITaskAttachment } from "@/types";
import { attachmentExtLabel, formatBytes } from "./file-rules";

interface AttachmentRowProps {
  attachment: ITaskAttachment;
  canDelete: boolean;
  isDownloading: boolean;
  isDeleting: boolean;
  onDownload: () => void;
  onRequestDelete: () => void;
}

function badgeClass(contentType: string): string {
  if (contentType.startsWith("image/")) return "bg-primary/10 text-primary";
  if (contentType === "application/pdf") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

/** One uploaded attachment: badge, name (click = download), meta, actions. */
export default function AttachmentRow({
  attachment,
  canDelete,
  isDownloading,
  isDeleting,
  onDownload,
  onRequestDelete,
}: Readonly<AttachmentRowProps>) {
  const { file_name, content_type, size_bytes, uploaded_by, created_at } = attachment;

  return (
    <div className="group flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
          badgeClass(content_type),
        )}
      >
        {attachmentExtLabel(file_name)}
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          title={file_name}
          className="block max-w-full truncate rounded-sm text-left text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {file_name}
        </button>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatBytes(size_bytes)} · {uploaded_by?.full_name ?? "Deleted user"} ·{" "}
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Download ${file_name}`}
          aria-busy={isDownloading}
          disabled={isDownloading}
          onClick={onDownload}
        >
          <Download aria-hidden="true" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete ${file_name}`}
            aria-busy={isDeleting}
            disabled={isDeleting}
            onClick={onRequestDelete}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
