import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import CommentsSection from "../comments";
import type { IComment } from "@/types";

// --- Helpers ---

function createComment(overrides: Partial<IComment> = {}): IComment {
  return {
    id: "comment-1",
    content: "<p>Test comment</p>",
    is_edited: false,
    task_id: "task-1",
    author: {
      id: "user-1",
      full_name: "Alice",
      avatar_url: "",
    },
    created_at: "2026-03-20T10:00:00.000Z",
    updated_at: "2026-03-20T10:00:00.000Z",
    ...overrides,
  };
}

// --- Mocks ---

// Stable reference to avoid infinite re-render loop with prevDataRef sync
const commentsData = [
  createComment({ id: "c-1", content: "<p>First comment</p>", created_at: "2026-03-20T10:00:00.000Z" }),
  createComment({ id: "c-2", content: "<p>Second comment</p>", created_at: "2026-03-20T11:00:00.000Z" }),
  createComment({ id: "c-3", content: "<p>Third comment</p>", created_at: "2026-03-20T09:00:00.000Z" }),
];

vi.mock("../hooks/use-get-task-comments", () => ({
  useGetTaskComments: () => ({
    data: { data: commentsData },
  }),
}));

const mockDeleteComment = vi.fn();
vi.mock("../hooks/use-delete-comment", () => ({
  useDeleteComment: () => ({ mutateAsync: mockDeleteComment }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// Mock TaskCommentItem — render content and expose onDelete
vi.mock("@/components/TaskComment/item", () => ({
  default: ({ comment, onDelete }: { comment: IComment; onDelete: (id: string) => void }) => (
    <div data-testid="comment-item">
      {comment.content}
      <button data-testid={`delete-${comment.id}`} onClick={() => onDelete(comment.id)}>
        Delete
      </button>
    </div>
  ),
}));

// Mock CommentEditor — expose onCommentCreated
let capturedOnCommentCreated: ((comment: IComment) => void) | undefined;

vi.mock("@/components/TaskComment/editor", () => ({
  default: ({
    onCommentCreated,
  }: {
    taskId: string;
    onCommentCreated: (comment: IComment) => void;
  }) => {
    capturedOnCommentCreated = onCommentCreated;
    return <div data-testid="comment-editor" />;
  },
}));

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnCommentCreated = undefined;
});

describe("CommentsSection", () => {
  describe("rendering", () => {
    it("renders all comments", () => {
      render(<CommentsSection taskId="task-1" />);

      const items = screen.getAllByTestId("comment-item");
      expect(items).toHaveLength(3);
    });

    it("renders comments sorted by created_at ascending (oldest first)", () => {
      render(<CommentsSection taskId="task-1" />);

      const items = screen.getAllByTestId("comment-item");
      // c-3 (09:00) → c-1 (10:00) → c-2 (11:00)
      expect(items[0]).toHaveTextContent("Third comment");
      expect(items[1]).toHaveTextContent("First comment");
      expect(items[2]).toHaveTextContent("Second comment");
    });

    it("renders the comment editor", () => {
      render(<CommentsSection taskId="task-1" />);

      expect(screen.getByTestId("comment-editor")).toBeInTheDocument();
    });

  });

  describe("optimistic comment creation", () => {
    it("appends new comment at the bottom of the list", () => {
      render(<CommentsSection taskId="task-1" />);

      const newComment = createComment({
        id: "c-new",
        content: "<p>New comment</p>",
        created_at: "2026-03-20T12:00:00.000Z",
      });

      act(() => {
        capturedOnCommentCreated?.(newComment);
      });

      const items = screen.getAllByTestId("comment-item");
      expect(items).toHaveLength(4);
      expect(items[3]).toHaveTextContent("New comment");
    });

    it("preserves existing comment order when adding new comment", () => {
      render(<CommentsSection taskId="task-1" />);

      const newComment = createComment({
        id: "c-new",
        content: "<p>New comment</p>",
        created_at: "2026-03-20T12:00:00.000Z",
      });

      act(() => {
        capturedOnCommentCreated?.(newComment);
      });

      const items = screen.getAllByTestId("comment-item");
      // Original sorted order preserved: c-3, c-1, c-2, then new
      expect(items[0]).toHaveTextContent("Third comment");
      expect(items[1]).toHaveTextContent("First comment");
      expect(items[2]).toHaveTextContent("Second comment");
      expect(items[3]).toHaveTextContent("New comment");
    });

    it("supports adding multiple comments sequentially", () => {
      render(<CommentsSection taskId="task-1" />);

      act(() => {
        capturedOnCommentCreated?.(
          createComment({ id: "c-4", content: "<p>Fourth</p>", created_at: "2026-03-20T13:00:00.000Z" }),
        );
      });

      act(() => {
        capturedOnCommentCreated?.(
          createComment({ id: "c-5", content: "<p>Fifth</p>", created_at: "2026-03-20T14:00:00.000Z" }),
        );
      });

      const items = screen.getAllByTestId("comment-item");
      expect(items).toHaveLength(5);
      expect(items[3]).toHaveTextContent("Fourth");
      expect(items[4]).toHaveTextContent("Fifth");
    });
  });

  describe("comment deletion", () => {
    it("removes the comment from the list on successful deletion", async () => {
      mockDeleteComment.mockResolvedValueOnce(undefined);

      render(<CommentsSection taskId="task-1" />);
      expect(screen.getAllByTestId("comment-item")).toHaveLength(3);

      await act(async () => {
        screen.getByTestId("delete-c-1").click();
      });

      const items = screen.getAllByTestId("comment-item");
      expect(items).toHaveLength(2);
      // c-3 (09:00) → c-2 (11:00), c-1 removed
      expect(items[0]).toHaveTextContent("Third comment");
      expect(items[1]).toHaveTextContent("Second comment");
    });

    it("shows error toast and keeps comment when deletion fails", async () => {
      mockDeleteComment.mockRejectedValueOnce(new Error("Network error"));

      render(<CommentsSection taskId="task-1" />);

      await act(async () => {
        screen.getByTestId("delete-c-1").click();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete comment, please try again.");
      });

      // All comments remain
      expect(screen.getAllByTestId("comment-item")).toHaveLength(3);
    });
  });
});
