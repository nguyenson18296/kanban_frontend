import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDeleteAttachment } from "../hooks/use-delete-attachment";
import { deleteTaskAttachment } from "@/services/attachment.service";
import { HttpError } from "@/lib/http-client";
import { TASK_ID, createQueryWrapper } from "./test-utils";

vi.mock("@/services/attachment.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
});

const ATTACHMENT_ID = "5b1e0c1a-7d2e-4f3a-9b8c-1d2e3f4a5b6c";

describe("useDeleteAttachment", () => {
  it("deletes through the service and refreshes the attachment list", async () => {
    vi.mocked(deleteTaskAttachment).mockResolvedValue(undefined);
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });
    result.current.mutate({ taskId: TASK_ID, attachmentId: ATTACHMENT_ID });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteTaskAttachment).toHaveBeenCalledWith(TASK_ID, ATTACHMENT_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["task-attachments", TASK_ID] });
  });

  it("toasts the server message when the delete is rejected", async () => {
    vi.mocked(deleteTaskAttachment).mockRejectedValue(
      new HttpError(403, "DELETE /tasks/x/attachments/y failed with status 403", {
        statusCode: 403,
        message: "Only the uploader or a project admin can delete this attachment",
      }),
    );
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });
    result.current.mutate({ taskId: TASK_ID, attachmentId: ATTACHMENT_ID });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      "Only the uploader or a project admin can delete this attachment",
    );
  });
});
