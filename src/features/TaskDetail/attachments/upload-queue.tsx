import { AlertCircle, RotateCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { attachmentExtLabel } from "./file-rules";
import type { UploadQueueItem } from "./hooks/use-upload-queue";

interface UploadQueueProps {
  items: UploadQueueItem[];
  uploadingCount: number;
  onRetry: (localId: string) => void;
  onCancel: (localId: string) => void;
  onDismiss: (localId: string) => void;
  onCancelAll: () => void;
}

function ExtBadge({ fileName }: Readonly<{ fileName: string }>) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground"
    >
      {attachmentExtLabel(fileName)}
    </span>
  );
}

/** In-flight, failed and locally rejected uploads, one row per file. */
export default function UploadQueue({
  items,
  uploadingCount,
  onRetry,
  onCancel,
  onDismiss,
  onCancelAll,
}: Readonly<UploadQueueProps>) {
  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="mb-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
    >
      {uploadingCount >= 2 ? (
        <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Uploading {uploadingCount} files
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onCancelAll}>
            Cancel all
          </Button>
        </div>
      ) : null}

      {items.map((item) => {
        if (item.status === "uploading") {
          const percent = Math.round(item.progress * 100);
          return (
            <div key={item.localId} className="flex items-center gap-3 px-3 py-2.5">
              <ExtBadge fileName={item.fileName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={item.fileName}>
                  {item.fileName}
                </p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${item.fileName}`}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground"
                aria-label={`Cancel upload of ${item.fileName}`}
                onClick={() => onCancel(item.localId)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          );
        }

        // failed (server/network, retryable) or rejected (local pre-check).
        return (
          <div
            key={item.localId}
            role="alert"
            className="flex items-center gap-3 bg-destructive/5 px-3 py-2.5"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive"
            >
              <AlertCircle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={item.fileName}>
                {item.fileName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.status === "failed" ? `Upload failed · ${item.message}` : item.message}
              </p>
            </div>
            {item.status === "failed" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2.5 text-xs"
                aria-label={`Retry upload of ${item.fileName}`}
                onClick={() => onRetry(item.localId)}
              >
                <RotateCw aria-hidden="true" className="size-3.5" />
                Retry
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground"
              aria-label={`Remove ${item.fileName} from the queue`}
              onClick={() => onDismiss(item.localId)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
