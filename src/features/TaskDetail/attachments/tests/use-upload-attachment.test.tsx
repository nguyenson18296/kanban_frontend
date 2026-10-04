import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUploadAttachment } from "../hooks/use-upload-attachment";
import { uploadTaskAttachment } from "@/services/attachment.service";
import { HttpError } from "@/lib/http-client";
import { TASK_ID, createQueryWrapper, makeAttachment } from "./test-utils";

vi.mock("@/services/attachment.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useUploadAttachment", () => {
  it("uploads through the service and refreshes the attachment list on success", async () => {
    vi.mocked(uploadTaskAttachment).mockResolvedValue(makeAttachment());
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const file = new File([new Uint8Array(4)], "shot.png", { type: "image/png" });
    const onProgress = vi.fn();
    const controller = new AbortController();

    const { result } = renderHook(() => useUploadAttachment(), { wrapper });
    result.current.mutate({ taskId: TASK_ID, file, onProgress, signal: controller.signal });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(uploadTaskAttachment).toHaveBeenCalledWith(TASK_ID, file, {
      onProgress,
      signal: controller.signal,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["task-attachments", TASK_ID] });
  });

  it("propagates the failure to the caller without toasting — the queue renders it inline", async () => {
    vi.mocked(uploadTaskAttachment).mockRejectedValue(
      new HttpError(415, "POST /tasks/x/attachments failed with status 415", {
        statusCode: 415,
        message: "File type is not allowed.",
      }),
    );
    const { wrapper } = createQueryWrapper();
    const onError = vi.fn();

    const { result } = renderHook(() => useUploadAttachment(), { wrapper });
    result.current.mutate(
      { taskId: TASK_ID, file: new File([new Uint8Array(1)], "x.png") },
      { onError },
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});
