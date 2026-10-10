import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDownloadAttachment } from "../hooks/use-download-attachment";
import { getAttachmentDownload } from "@/services/attachment.service";
import { HttpError } from "@/lib/http-client";
import { TASK_ID, createQueryWrapper } from "./test-utils";

vi.mock("@/services/attachment.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.restoreAllMocks();
});

const ATTACHMENT_ID = "5b1e0c1a-7d2e-4f3a-9b8c-1d2e3f4a5b6c";
const SIGNED_URL = "https://storage.example.com/task-attachments/abc?X-Amz-Signature=sig";

describe("useDownloadAttachment", () => {
  it("fetches a fresh signed URL and navigates it through a temporary download anchor", async () => {
    vi.mocked(getAttachmentDownload).mockResolvedValue({
      url: SIGNED_URL,
      expires_at: "2026-09-26T10:05:00.000Z",
    });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useDownloadAttachment(), { wrapper });
    result.current.mutate({
      taskId: TASK_ID,
      attachmentId: ATTACHMENT_ID,
      fileName: "login-bug.png",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAttachmentDownload).toHaveBeenCalledWith(TASK_ID, ATTACHMENT_ID);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].getAttribute("href")).toBe(SIGNED_URL);
    expect(clicked[0].getAttribute("download")).toBe("login-bug.png");
    // The temporary anchor must not linger in the document.
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("toasts a readable fallback when signing the URL fails", async () => {
    vi.mocked(getAttachmentDownload).mockRejectedValue(
      new HttpError(503, "GET /tasks/x/attachments/y/download failed with status 503", {
        statusCode: 503,
        message: "File storage is unavailable, please try again",
      }),
    );
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useDownloadAttachment(), { wrapper });
    result.current.mutate({
      taskId: TASK_ID,
      attachmentId: ATTACHMENT_ID,
      fileName: "login-bug.png",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("File storage is unavailable, please try again");
  });
});
