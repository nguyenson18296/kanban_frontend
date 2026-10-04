import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteTaskAttachment,
  getAttachmentDownload,
  getTaskAttachments,
  uploadTaskAttachment,
} from "../attachment.service";
import { httpClient } from "@/lib/http-client";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), delete: vi.fn(), upload: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

const TASK_ID = "9c2d7f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f";
const ATTACHMENT_ID = "5b1e0c1a-7d2e-4f3a-9b8c-1d2e3f4a5b6c";

describe("attachment service", () => {
  it("getTaskAttachments fetches one page and passes the abort signal", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [], meta: {} });
    const controller = new AbortController();

    await getTaskAttachments(TASK_ID, 2, 20, controller.signal);

    expect(httpClient.get).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/attachments?page=2&limit=20`,
      controller.signal,
    );
  });

  it("uploadTaskAttachment sends the file as the single multipart part named 'file'", async () => {
    vi.mocked(httpClient.upload).mockResolvedValue({ id: ATTACHMENT_ID });
    const file = new File([new Uint8Array(4)], "shot.png", { type: "image/png" });
    const onProgress = vi.fn();
    const controller = new AbortController();

    await uploadTaskAttachment(TASK_ID, file, { onProgress, signal: controller.signal });

    expect(httpClient.upload).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/attachments`,
      expect.any(FormData),
      { onProgress, signal: controller.signal },
    );
    const form = vi.mocked(httpClient.upload).mock.calls[0][1];
    expect(form.get("file")).toBe(file);
  });

  it("getAttachmentDownload requests a fresh signed URL", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ url: "https://r2/x", expires_at: "soon" });

    await getAttachmentDownload(TASK_ID, ATTACHMENT_ID);

    expect(httpClient.get).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/attachments/${ATTACHMENT_ID}/download`,
    );
  });

  it("deleteTaskAttachment deletes one attachment", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(undefined);

    await deleteTaskAttachment(TASK_ID, ATTACHMENT_ID);

    expect(httpClient.delete).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/attachments/${ATTACHMENT_ID}`,
    );
  });
});
