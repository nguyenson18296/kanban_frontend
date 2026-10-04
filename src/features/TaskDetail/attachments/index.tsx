import { useEffect, useRef, useState } from "react";
import { CloudUpload, Download, Lock, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetProjectMembers } from "@/features/Settings/hooks/use-get-project-members";
import { normalizeProjectRole } from "@/features/Settings/member-roles";
import { useStoreUser } from "@/stores/use-store-user";
import type { ITaskAttachment } from "@/types";

import AttachmentRow from "./attachment-row";
import AttachmentTile from "./attachment-tile";
import UploadQueue from "./upload-queue";
import { formatBytes } from "./file-rules";
import { useAttachmentPreview } from "./hooks/use-attachment-preview";
import { useDeleteAttachment } from "./hooks/use-delete-attachment";
import { useDownloadAttachment } from "./hooks/use-download-attachment";
import { useTaskAttachments } from "./hooks/use-task-attachments";
import { useUploadQueue } from "./hooks/use-upload-queue";

const DROPZONE_HINT = "up to 10 MB";

interface TaskAttachmentsProps {
  taskId: string;
  ticketId: string;
  projectId: string;
}

export default function TaskAttachments({
  taskId,
  ticketId,
  projectId,
}: Readonly<TaskAttachmentsProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Each dialog splits its open flag from its subject: Radix keeps a closing
  // dialog mounted through the exit animation, so nulling the subject on
  // close would blank the content (loading flash) while it fades out.
  const [pendingDelete, setPendingDelete] = useState<ITaskAttachment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ITaskAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);

  // UX gating only — the server re-checks the role (403/404) on every route.
  const currentUserId = useStoreUser((s) => s.user?.id);
  const { data: members } = useGetProjectMembers(projectId);
  const membership = members?.find((member) => member.user.id === currentUserId);
  const role = membership ? normalizeProjectRole(membership.role) : null;
  const canUpload = role !== null && role !== "viewer";
  const canManage = role === "admin" || role === "owner";

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTaskAttachments(taskId);
  const queue = useUploadQueue(taskId);
  const deleteAttachment = useDeleteAttachment();
  const downloadAttachment = useDownloadAttachment();

  // Whole-window drag detection: dragging a file anywhere over the task view
  // raises the drop overlay (members get a target, viewers an explanation).
  useEffect(() => {
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepthRef.current += 1;
      setIsDraggingFile(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingFile(false);
    };
    const reset = () => {
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
    };
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", reset);
    document.addEventListener("dragend", reset);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", reset);
      document.removeEventListener("dragend", reset);
    };
  }, []);

  const openPicker = () => fileInputRef.current?.click();

  const handleOverlayDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
    if (canUpload && event.dataTransfer.files.length > 0) {
      queue.addFiles(event.dataTransfer.files);
    }
  };

  const openPreview = (attachment: ITaskAttachment) => {
    setPreviewAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const requestDelete = (attachment: ITaskAttachment) => {
    setPendingDelete(attachment);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteAttachment.mutate(
      { taskId, attachmentId: pendingDelete.id },
      { onSuccess: () => setIsDeleteConfirmOpen(false) },
    );
  };

  const attachments = data?.attachments ?? [];
  const total = data?.total ?? 0;
  const images = attachments.filter((a) => a.content_type.startsWith("image/"));
  const documents = attachments.filter((a) => !a.content_type.startsWith("image/"));

  const canDeleteAttachment = (attachment: ITaskAttachment) =>
    canManage || (canUpload && attachment.uploaded_by?.id === currentUserId);
  const isDownloadingAttachment = (attachment: ITaskAttachment) =>
    downloadAttachment.isPending && downloadAttachment.variables?.attachmentId === attachment.id;
  const isDeletingAttachment = (attachment: ITaskAttachment) =>
    deleteAttachment.isPending && deleteAttachment.variables?.attachmentId === attachment.id;
  const startDownload = (attachment: ITaskAttachment) =>
    downloadAttachment.mutate({
      taskId,
      attachmentId: attachment.id,
      fileName: attachment.file_name,
    });

  // Large preview for the open tile; cache-shared with the tile's thumbnail fetch.
  const lightbox = useAttachmentPreview(
    taskId,
    previewAttachment?.id ?? "",
    previewAttachment !== null,
  );

  return (
    <section aria-label="Attachments" className="my-4">
      {canUpload && (
        <input
          ref={fileInputRef}
          data-testid="attachment-file-input"
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.md,.markdown"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) queue.addFiles(event.target.files);
            // Allow re-picking the same file (e.g. after a cancel or failure).
            event.target.value = "";
          }}
        />
      )}

      <div className="mb-2.5 flex min-h-7 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Attachments
          </h2>
          {total ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {total}
            </span>
          ) : null}
        </div>
        {canUpload && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            aria-label="Add attachment"
            onClick={openPicker}
          >
            <Paperclip aria-hidden="true" className="size-3.5" />
            Add
          </Button>
        )}
        {role === "viewer" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock aria-hidden="true" className="size-3.5" />
            View only
          </span>
        )}
      </div>

      <UploadQueue
        items={queue.items}
        uploadingCount={queue.uploadingCount}
        onRetry={queue.retryUpload}
        onCancel={queue.cancelUpload}
        onDismiss={queue.dismissUpload}
        onCancelAll={queue.cancelAll}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading attachments…</p>}

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground">
          <span>Couldn&apos;t load attachments.</span>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-2.5 gap-y-3">
          {images.map((attachment) => (
            <AttachmentTile
              key={attachment.id}
              taskId={taskId}
              attachment={attachment}
              canDelete={canDeleteAttachment(attachment)}
              isDownloading={isDownloadingAttachment(attachment)}
              isDeleting={isDeletingAttachment(attachment)}
              onPreview={() => openPreview(attachment)}
              onDownload={() => startDownload(attachment)}
              onRequestDelete={() => requestDelete(attachment)}
            />
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {documents.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              canDelete={canDeleteAttachment(attachment)}
              isDownloading={isDownloadingAttachment(attachment)}
              isDeleting={isDeletingAttachment(attachment)}
              onDownload={() => startDownload(attachment)}
              onRequestDelete={() => requestDelete(attachment)}
            />
          ))}
        </div>
      )}

      {hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2.5 text-xs text-primary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      {!isLoading && !isError && attachments.length === 0 && canUpload && (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloudUpload aria-hidden="true" className="size-4" />
          <span>
            Drop files here or <span className="font-semibold text-primary">browse</span> ·{" "}
            {DROPZONE_HINT}
          </span>
        </button>
      )}

      {!isLoading && !isError && attachments.length === 0 && !canUpload && (
        <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border p-4 text-sm text-muted-foreground">
          <Paperclip aria-hidden="true" className="size-4" />
          <span>No attachments</span>
        </div>
      )}

      {attachments.length > 0 && canUpload && (
        <button
          type="button"
          onClick={openPicker}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-ring hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloudUpload aria-hidden="true" className="size-3.5" />
          <span className="truncate">
            Drop files here or <span className="font-semibold text-primary">browse</span> ·{" "}
            {DROPZONE_HINT}
          </span>
        </button>
      )}

      {isDraggingFile && (
        <div
          data-testid="attachment-drop-overlay"
          className="fixed inset-0 z-50 bg-background/80 p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleOverlayDrop}
        >
          <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ring bg-accent/30 text-center">
            {canUpload ? (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CloudUpload aria-hidden="true" className="size-6" />
                </span>
                <p className="text-base font-semibold">Drop to attach to {ticketId}</p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPEG, GIF, WebP, PDF or Markdown · {DROPZONE_HINT} each
                </p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Lock aria-hidden="true" className="size-6" />
                </span>
                <p className="text-base font-semibold">You have view-only access</p>
                <p className="text-sm text-muted-foreground">
                  Ask a project member to attach this file
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          if (!open) setIsPreviewOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-all">{previewAttachment?.file_name}</DialogTitle>
            <DialogDescription>
              {previewAttachment
                ? `${formatBytes(previewAttachment.size_bytes)} · ${
                    previewAttachment.uploaded_by?.full_name ?? "Deleted user"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {previewAttachment && lightbox.data?.url ? (
            <img
              src={lightbox.data.url}
              alt={previewAttachment.file_name}
              className="max-h-[70vh] w-full rounded-md bg-muted object-contain"
            />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
              {lightbox.isError ? "Couldn't load the preview" : "Loading preview…"}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={previewAttachment ? isDownloadingAttachment(previewAttachment) : false}
              onClick={() => previewAttachment && startDownload(previewAttachment)}
            >
              <Download aria-hidden="true" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleteAttachment.isPending) setIsDeleteConfirmOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="break-all">Delete {pendingDelete?.file_name}?</DialogTitle>
            <DialogDescription>
              This removes the file for everyone on the task. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteAttachment.isPending}
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAttachment.isPending}
              aria-busy={deleteAttachment.isPending}
              onClick={confirmDelete}
            >
              Delete attachment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
