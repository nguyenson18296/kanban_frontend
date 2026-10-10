import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Download, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ITaskAttachment } from "@/types";
import { attachmentExtLabel, formatBytes } from "./file-rules";
import { useAttachmentPreview } from "./hooks/use-attachment-preview";

interface AttachmentTileProps {
  taskId: string;
  attachment: ITaskAttachment;
  canDelete: boolean;
  isDownloading: boolean;
  isDeleting: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onRequestDelete: () => void;
}

/** Thumbnail tile for an image attachment; click opens the large preview. */
export default function AttachmentTile({
  taskId,
  attachment,
  canDelete,
  isDownloading,
  isDeleting,
  onPreview,
  onDownload,
  onRequestDelete,
}: Readonly<AttachmentTileProps>) {
  const { file_name, size_bytes, uploaded_by, created_at } = attachment;
  const { data: preview } = useAttachmentPreview(taskId, attachment.id, true);
  // Remember which URL failed: a later, fresh URL renders again on its own.
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const src = preview?.url;
  const showImage = !!src && src !== erroredSrc;

  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        onClick={onPreview}
        title={file_name}
        aria-label={`Preview ${file_name}`}
        className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted/40 transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {showImage ? (
          <img
            src={src}
            alt={file_name}
            loading="lazy"
            onError={() => setErroredSrc(src)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[10px] font-bold text-muted-foreground">
            {attachmentExtLabel(file_name)}
          </span>
        )}
      </button>

      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="outline"
          size="icon"
          className="size-6 bg-card shadow-sm"
          aria-label={`Download ${file_name}`}
          aria-busy={isDownloading}
          disabled={isDownloading}
          onClick={onDownload}
        >
          <Download aria-hidden="true" className="size-3.5" />
        </Button>
        {canDelete && (
          <Button
            variant="outline"
            size="icon"
            className="size-6 bg-card text-muted-foreground shadow-sm hover:text-destructive"
            aria-label={`Delete ${file_name}`}
            aria-busy={isDeleting}
            disabled={isDeleting}
            onClick={onRequestDelete}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </Button>
        )}
      </div>

      <p className="mt-1.5 truncate text-xs font-medium" title={file_name}>
        {file_name}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {uploaded_by && (
          <Avatar className="size-4" title={uploaded_by.full_name}>
            <AvatarImage src={uploaded_by.avatar_url} alt="" />
            <AvatarFallback className="text-[8px]">
              {uploaded_by.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="truncate">
          {formatBytes(size_bytes)} ·{" "}
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </span>
      </p>
    </div>
  );
}
