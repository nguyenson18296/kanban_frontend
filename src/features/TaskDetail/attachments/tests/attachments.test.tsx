import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TaskAttachments from "..";
import {
  deleteTaskAttachment,
  getAttachmentDownload,
  getTaskAttachments,
  uploadTaskAttachment,
} from "@/services/attachment.service";
import { getProjectMembers } from "@/services/project.service";
import { useStoreUser } from "@/stores/use-store-user";
import type { IProjectMembersResponse } from "@/types";
import { TASK_ID, createQueryWrapper, makeAttachment, makePage, makeUploader } from "./test-utils";

vi.mock("@/services/attachment.service");
vi.mock("@/services/project.service");

const PROJECT_ID = "project-1";
const TICKET_ID = "KAN-7";
const ME = makeUploader(); // the signed-in user is also the default uploader fixture

function membersResponse(role: string): IProjectMembersResponse {
  return {
    data: [
      {
        project_id: PROJECT_ID,
        user_id: ME.id,
        role,
        joined_at: "2026-01-01T00:00:00Z",
        user: { ...ME },
      },
    ],
    status: 200,
    success: true,
  };
}

function seedRole(role: string) {
  vi.mocked(getProjectMembers).mockResolvedValue(membersResponse(role));
}

function renderAttachments() {
  const { wrapper } = createQueryWrapper();
  return render(
    <TaskAttachments taskId={TASK_ID} ticketId={TICKET_ID} projectId={PROJECT_ID} />,
    { wrapper },
  );
}

function png(name = "new-shot.png"): File {
  return new File([new Uint8Array(8)], name, { type: "image/png" });
}

const SIGNED_URL = "https://storage.example.com/task-attachments/abc?X-Amz-Signature=sig";

function makePdf(overrides: Parameters<typeof makeAttachment>[0] = {}) {
  return makeAttachment({
    file_name: "product-spec.pdf",
    content_type: "application/pdf",
    ...overrides,
  });
}

beforeEach(() => {
  useStoreUser.setState({
    user: { id: ME.id, email: ME.email, full_name: ME.full_name, role: ME.role, avatar_url: "" },
  });
  vi.mocked(getTaskAttachments).mockResolvedValue(makePage([makeAttachment()]));
  // Image tiles request a signed preview URL as soon as they mount.
  vi.mocked(getAttachmentDownload).mockResolvedValue({
    url: SIGNED_URL,
    expires_at: "2026-09-26T10:05:00.000Z",
  });
  seedRole("member");
});

afterEach(() => {
  cleanup();
  // clearAllMocks wipes the module auto-mocks' call history; restoreAllMocks
  // removes vi.spyOn spies (the anchor-click one). Both are needed.
  vi.clearAllMocks();
  vi.restoreAllMocks();
  useStoreUser.setState({ user: null });
});

describe("TaskAttachments — list", () => {
  it("renders a document row with its size, uploader and age", async () => {
    vi.mocked(getTaskAttachments).mockResolvedValue(makePage([makePdf()]));
    renderAttachments();

    expect(await screen.findByText("product-spec.pdf")).toBeInTheDocument();
    expect(screen.getByText(/470\.8 KB/)).toBeInTheDocument();
    expect(screen.getByText(/Son Nguyen/)).toBeInTheDocument();
    expect(screen.getByText(/ago/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // count badge
  });

  it("names a deleted uploader gracefully", async () => {
    vi.mocked(getTaskAttachments).mockResolvedValue(makePage([makePdf({ uploaded_by: null })]));
    renderAttachments();

    expect(await screen.findByText(/Deleted user/)).toBeInTheDocument();
  });

  it("pages forward with Load more", async () => {
    const user = userEvent.setup();
    vi.mocked(getTaskAttachments)
      .mockResolvedValueOnce(
        makePage([makeAttachment({ id: "a1", file_name: "one.png" })], {
          page: 1,
          total: 2,
          totalPages: 2,
        }),
      )
      .mockResolvedValueOnce(
        makePage([makeAttachment({ id: "a2", file_name: "two.pdf" })], {
          page: 2,
          total: 2,
          totalPages: 2,
        }),
      );
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("two.pdf")).toBeInTheDocument();
    expect(vi.mocked(getTaskAttachments)).toHaveBeenLastCalledWith(
      TASK_ID,
      2,
      expect.any(Number),
      expect.any(AbortSignal),
    );
  });

  it("offers a retry when the list cannot load", async () => {
    vi.mocked(getTaskAttachments)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makePage([makeAttachment()]));
    const user = userEvent.setup();
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("login-bug.png")).toBeInTheDocument();
  });
});

describe("TaskAttachments — permissions", () => {
  it("gives a viewer the list but no upload or delete controls", async () => {
    seedRole("viewer");
    renderAttachments();

    expect(await screen.findByText("login-bug.png")).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add attachment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete login-bug/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/browse/)).not.toBeInTheDocument();
    // Download stays available to viewers.
    expect(screen.getByRole("button", { name: "Download login-bug.png" })).toBeInTheDocument();
  });

  it("shows a viewer with no attachments a plain empty state, not an upload invite", async () => {
    seedRole("viewer");
    vi.mocked(getTaskAttachments).mockResolvedValue(makePage([]));
    renderAttachments();

    expect(await screen.findByText("No attachments")).toBeInTheDocument();
    expect(screen.queryByText(/browse/)).not.toBeInTheDocument();
  });

  it("lets a member delete their own file but not someone else's", async () => {
    vi.mocked(getTaskAttachments).mockResolvedValue(
      makePage([
        makeAttachment({ id: "mine", file_name: "mine.png" }),
        makeAttachment({
          id: "theirs",
          file_name: "theirs.png",
          uploaded_by: makeUploader({ id: "someone-else", full_name: "Someone Else" }),
        }),
      ]),
    );
    renderAttachments();

    expect(await screen.findByText("mine.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete mine.png" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete theirs.png" })).not.toBeInTheDocument();
  });

  it("lets an admin delete anyone's file", async () => {
    seedRole("admin");
    vi.mocked(getTaskAttachments).mockResolvedValue(
      makePage([
        makeAttachment({
          id: "theirs",
          file_name: "theirs.png",
          uploaded_by: makeUploader({ id: "someone-else" }),
        }),
      ]),
    );
    renderAttachments();

    expect(await screen.findByRole("button", { name: "Delete theirs.png" })).toBeInTheDocument();
  });
});

describe("TaskAttachments — upload", () => {
  it("uploads picked files and shows the refreshed list", async () => {
    vi.mocked(getTaskAttachments)
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValue(makePage([makeAttachment({ file_name: "new-shot.png" })]));
    vi.mocked(uploadTaskAttachment).mockResolvedValue(
      makeAttachment({ file_name: "new-shot.png" }),
    );
    renderAttachments();
    await screen.findByText(/browse/); // member empty state invites the first upload

    const input = screen.getByTestId("attachment-file-input");
    fireEvent.change(input, { target: { files: [png()] } });

    // Re-query each attempt: the name first renders as a queue row, which is
    // dequeued once the refreshed list (a different node) contains the file.
    await waitFor(() => {
      expect(screen.getByText("new-shot.png")).toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    expect(uploadTaskAttachment).toHaveBeenCalledWith(
      TASK_ID,
      expect.any(File),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects a disallowed file locally and never calls the server", async () => {
    renderAttachments();
    await screen.findByText("login-bug.png");

    const input = screen.getByTestId("attachment-file-input");
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(4)], "tool.exe")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("File type is not allowed");
    expect(uploadTaskAttachment).not.toHaveBeenCalled();
  });
});

describe("TaskAttachments — image previews", () => {
  it("shows an image as a preview tile using a fresh signed URL", async () => {
    renderAttachments();

    const img = await screen.findByRole("img", { name: "login-bug.png" });
    expect(img).toHaveAttribute("src", SIGNED_URL);
    expect(getAttachmentDownload).toHaveBeenCalledWith(TASK_ID, makeAttachment().id);
    expect(screen.getByRole("button", { name: "Preview login-bug.png" })).toBeInTheDocument();
  });

  it("keeps non-image files as plain rows without fetching a preview", async () => {
    vi.mocked(getTaskAttachments).mockResolvedValue(makePage([makePdf()]));
    renderAttachments();

    expect(await screen.findByText("product-spec.pdf")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preview product-spec.pdf" }),
    ).not.toBeInTheDocument();
    expect(getAttachmentDownload).not.toHaveBeenCalled();
  });

  it("opens a larger preview with a download action when the tile is clicked", async () => {
    const user = userEvent.setup();
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Preview login-bug.png" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "login-bug.png" })).toHaveAttribute(
      "src",
      SIGNED_URL,
    );
    expect(within(dialog).getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("falls back to a placeholder tile when the signed image fails to load", async () => {
    renderAttachments();

    fireEvent.error(await screen.findByRole("img", { name: "login-bug.png" }));

    await waitFor(() =>
      expect(screen.queryByRole("img", { name: "login-bug.png" })).not.toBeInTheDocument(),
    );
    // The tile stays usable — preview still opens (and can fetch a fresh URL).
    expect(screen.getByRole("button", { name: "Preview login-bug.png" })).toBeInTheDocument();
  });
});

describe("TaskAttachments — download & delete", () => {
  it("downloads on the tile's download control via a temporary anchor", async () => {
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
    const user = userEvent.setup();
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Download login-bug.png" }));

    // The tile's mount-time preview fetch must not trigger any download.
    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0].getAttribute("download")).toBe("login-bug.png");
  });

  it("deletes only after the confirmation dialog is accepted", async () => {
    vi.mocked(deleteTaskAttachment).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Delete login-bug.png" }));
    expect(deleteTaskAttachment).not.toHaveBeenCalled();
    expect(await screen.findByText(/cannot be undone/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete attachment" }));

    await waitFor(() =>
      expect(deleteTaskAttachment).toHaveBeenCalledWith(TASK_ID, makeAttachment().id),
    );
    await waitFor(() =>
      expect(screen.queryByText(/cannot be undone/)).not.toBeInTheDocument(),
    );
  });

  it("keeps the file when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderAttachments();

    await user.click(await screen.findByRole("button", { name: "Delete login-bug.png" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteTaskAttachment).not.toHaveBeenCalled();
    expect(screen.getByText("login-bug.png")).toBeInTheDocument();
  });
});

describe("TaskAttachments — drag and drop", () => {
  it("shows the drop overlay while dragging files and uploads the drop", async () => {
    vi.mocked(uploadTaskAttachment).mockResolvedValue(makeAttachment());
    renderAttachments();
    await screen.findByText("login-bug.png");

    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    expect(await screen.findByText(`Drop to attach to ${TICKET_ID}`)).toBeInTheDocument();

    fireEvent.drop(screen.getByTestId("attachment-drop-overlay"), {
      dataTransfer: { types: ["Files"], files: [png("dropped.png")] },
    });

    await waitFor(() => expect(uploadTaskAttachment).toHaveBeenCalled());
    expect(screen.queryByTestId("attachment-drop-overlay")).not.toBeInTheDocument();
  });

  it("tells a viewer the drop is view-only and ignores their drop", async () => {
    seedRole("viewer");
    renderAttachments();
    await screen.findByText("login-bug.png");

    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    expect(await screen.findByText("You have view-only access")).toBeInTheDocument();

    fireEvent.drop(screen.getByTestId("attachment-drop-overlay"), {
      dataTransfer: { types: ["Files"], files: [png()] },
    });

    expect(uploadTaskAttachment).not.toHaveBeenCalled();
  });

  it("ignores drags that carry no files (e.g. dragging text)", async () => {
    renderAttachments();
    await screen.findByText("login-bug.png");

    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["text/plain"], files: [] } });

    expect(screen.queryByTestId("attachment-drop-overlay")).not.toBeInTheDocument();
  });

  it("keeps the overlay up while dragging across nested elements", async () => {
    renderAttachments();
    await screen.findByText("login-bug.png");

    // Entering a child fires another dragenter before the parent's dragleave.
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    fireEvent.dragLeave(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    expect(screen.getByTestId("attachment-drop-overlay")).toBeInTheDocument();

    fireEvent.dragLeave(document.body, { dataTransfer: { types: ["Files"], files: [] } });
    expect(screen.queryByTestId("attachment-drop-overlay")).not.toBeInTheDocument();
  });

  it("prevents the browser's default file-drop navigation anywhere in the document", async () => {
    renderAttachments();
    await screen.findByText("login-bug.png");

    // fireEvent returns false when preventDefault was called.
    const fileDragOver = fireEvent.dragOver(document.body, {
      dataTransfer: { types: ["Files"], files: [] },
    });
    const fileDrop = fireEvent.drop(document.body, {
      dataTransfer: { types: ["Files"], files: [png("stray.png")] },
    });

    expect(fileDragOver).toBe(false);
    expect(fileDrop).toBe(false);
    // A stray drop is neutralized, never uploaded.
    expect(uploadTaskAttachment).not.toHaveBeenCalled();

    // Text drags stay native — the comment editor's drops must not break.
    expect(
      fireEvent.dragOver(document.body, { dataTransfer: { types: ["text/plain"], files: [] } }),
    ).toBe(true);
  });
});
