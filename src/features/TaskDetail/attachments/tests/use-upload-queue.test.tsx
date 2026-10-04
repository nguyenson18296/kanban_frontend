import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUploadQueue } from "../hooks/use-upload-queue";
import { uploadTaskAttachment } from "@/services/attachment.service";
import { HttpError } from "@/lib/http-client";
import type { ITaskAttachment } from "@/types";
import { TASK_ID, createQueryWrapper, makeAttachment } from "./test-utils";

vi.mock("@/services/attachment.service");

interface PendingUpload {
  file: File;
  signal: AbortSignal | undefined;
  onProgress: ((loaded: number, total: number) => void) | undefined;
  resolve: (attachment: ITaskAttachment) => void;
  reject: (error: unknown) => void;
}

let pending: PendingUpload[];

beforeEach(() => {
  pending = [];
  vi.mocked(uploadTaskAttachment).mockImplementation(
    (_taskId, file, options) =>
      new Promise<ITaskAttachment>((resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The upload was aborted", "AbortError")),
        );
        pending.push({
          file,
          signal: options?.signal,
          onProgress: options?.onProgress,
          resolve,
          reject,
        });
      }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

function png(name = "shot.png", size = 8): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

function setup() {
  const { queryClient, wrapper } = createQueryWrapper();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const rendered = renderHook(() => useUploadQueue(TASK_ID), { wrapper });
  return { ...rendered, invalidateSpy };
}

describe("useUploadQueue", () => {
  it("rejects an invalid file locally, without calling the server", async () => {
    const { result } = setup();

    await act(async () => result.current.addFiles([new File([new Uint8Array(4)], "tool.exe")]));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      fileName: "tool.exe",
      status: "rejected",
      message: "File type is not allowed. Allowed types: PNG, JPEG, GIF, WebP, PDF, Markdown.",
    });
    expect(uploadTaskAttachment).not.toHaveBeenCalled();

    act(() => result.current.dismissUpload(result.current.items[0].localId));
    expect(result.current.items).toHaveLength(0);
  });

  it("uploads a valid file, tracks progress, and dequeues after the list refresh", async () => {
    const { result, invalidateSpy } = setup();

    await act(async () => result.current.addFiles([png()]));

    expect(result.current.items[0]).toMatchObject({
      fileName: "shot.png",
      status: "uploading",
      progress: 0,
    });
    expect(result.current.uploadingCount).toBe(1);

    act(() => pending[0].onProgress?.(50, 100));
    expect(result.current.items[0].progress).toBe(0.5);

    act(() => pending[0].resolve(makeAttachment()));
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["task-attachments", TASK_ID] });
  });

  it("marks a failed upload with the server message and can retry it", async () => {
    const { result } = setup();

    await act(async () => result.current.addFiles([png()]));
    act(() =>
      pending[0].reject(
        new HttpError(503, "POST /x failed with status 503", {
          statusCode: 503,
          message: "File storage is unavailable, please try again",
        }),
      ),
    );

    await waitFor(() => expect(result.current.items[0].status).toBe("failed"));
    expect(result.current.items[0].message).toBe(
      "File storage is unavailable, please try again",
    );
    expect(result.current.uploadingCount).toBe(0);

    await act(async () => result.current.retryUpload(result.current.items[0].localId));

    expect(result.current.items[0]).toMatchObject({ status: "uploading", progress: 0 });
    expect(uploadTaskAttachment).toHaveBeenCalledTimes(2);
    // Retry re-sends the same file.
    expect(pending[1].file).toBe(pending[0].file);

    act(() => pending[1].resolve(makeAttachment()));
    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it("falls back to a generic message when the failure carries no server body", async () => {
    const { result } = setup();

    await act(async () => result.current.addFiles([png()]));
    act(() => pending[0].reject(new HttpError(0, "POST /x failed: network error")));

    await waitFor(() => expect(result.current.items[0].status).toBe("failed"));
    expect(result.current.items[0].message).toBe("Check your connection and try again");
  });

  it("cancel aborts the in-flight request and drops the item without a failed state", async () => {
    const { result } = setup();

    await act(async () => result.current.addFiles([png()]));
    act(() => result.current.cancelUpload(result.current.items[0].localId));

    expect(pending[0].signal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it("uploads several files in parallel — one request each — and cancelAll aborts them all", async () => {
    const { result } = setup();

    await act(async () => result.current.addFiles([png("a.png"), png("b.png")]));

    expect(uploadTaskAttachment).toHaveBeenCalledTimes(2);
    expect(result.current.uploadingCount).toBe(2);

    act(() => result.current.cancelAll());

    expect(pending[0].signal?.aborted).toBe(true);
    expect(pending[1].signal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });
});
