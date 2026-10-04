import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import UploadQueue from "../upload-queue";
import type { UploadQueueItem } from "../hooks/use-upload-queue";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const handlers = {
  onRetry: vi.fn(),
  onCancel: vi.fn(),
  onDismiss: vi.fn(),
  onCancelAll: vi.fn(),
};

function makeItem(overrides: Partial<UploadQueueItem> = {}): UploadQueueItem {
  return {
    localId: "q1",
    fileName: "shot.png",
    sizeBytes: 2048,
    status: "uploading",
    progress: 0.5,
    ...overrides,
  };
}

function renderQueue(items: UploadQueueItem[], uploadingCount = 0) {
  return render(<UploadQueue items={items} uploadingCount={uploadingCount} {...handlers} />);
}

describe("UploadQueue", () => {
  it("renders nothing when the queue is empty", () => {
    const { container } = renderQueue([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an uploading row with an accessible progressbar and a cancel control", async () => {
    const user = userEvent.setup();
    renderQueue([makeItem()], 1);

    expect(screen.getByText("shot.png")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel upload of shot.png" }));
    expect(handlers.onCancel).toHaveBeenCalledWith("q1");
  });

  it("announces a failed row as an alert, with retry and dismiss", async () => {
    const user = userEvent.setup();
    renderQueue([
      makeItem({ status: "failed", message: "File storage is unavailable, please try again" }),
    ]);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Upload failed");
    expect(alert).toHaveTextContent("File storage is unavailable, please try again");

    await user.click(screen.getByRole("button", { name: "Retry upload of shot.png" }));
    expect(handlers.onRetry).toHaveBeenCalledWith("q1");

    await user.click(screen.getByRole("button", { name: "Remove shot.png from the queue" }));
    expect(handlers.onDismiss).toHaveBeenCalledWith("q1");
  });

  it("shows a rejected row without a retry — there is nothing to re-send", () => {
    renderQueue([
      makeItem({
        status: "rejected",
        message: "File type is not allowed. Allowed types: PNG, JPEG, GIF, WebP, PDF, Markdown.",
      }),
    ]);

    expect(screen.getByRole("alert")).toHaveTextContent("File type is not allowed");
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove shot.png from the queue" }),
    ).toBeInTheDocument();
  });

  it("offers Cancel all only while several files are uploading", async () => {
    const user = userEvent.setup();
    const { rerender } = renderQueue(
      [makeItem({ localId: "q1" }), makeItem({ localId: "q2", fileName: "two.pdf" })],
      2,
    );

    expect(screen.getByText("Uploading 2 files")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel all" }));
    expect(handlers.onCancelAll).toHaveBeenCalled();

    rerender(<UploadQueue items={[makeItem()]} uploadingCount={1} {...handlers} />);
    expect(screen.queryByText(/Uploading \d/)).not.toBeInTheDocument();
  });
});
