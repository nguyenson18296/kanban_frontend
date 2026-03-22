import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Subtask from "../index";
import { createTask } from "@/test-factories";
import type { ITask } from "@/types/task.type";

// --- Mocks ---

const mockReorderMutate = vi.fn();
const mockCreateMutateAsync = vi.fn();

// Stable reference to avoid infinite re-render loop with prevDataRef sync
const subtaskData = [
  createTask({ id: "sub-1", title: "First subtask" }),
  createTask({ id: "sub-2", title: "Second subtask" }),
  createTask({ id: "sub-3", title: "Third subtask" }),
];

vi.mock("../hooks/use-get-subtasks", () => ({
  useGetSubtasks: () => ({
    data: { data: subtaskData },
  }),
}));

vi.mock("../hooks/use-create-subtask", () => ({
  useCreateSubtask: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
}));

vi.mock("../hooks/use-reorder-subtask", () => ({
  useReorderSubtask: () => ({
    mutate: mockReorderMutate,
  }),
}));

// Capture onDragEnd so we can simulate drag events
let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd?: (event: unknown) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="drag-drop-provider">{children}</div>;
  },
}));

// SubtaskItem — render a simple div with the title so we can verify order
vi.mock("../item", () => ({
  default: ({ task, order }: { task: ITask; order: number }) => (
    <div data-testid="subtask-item" data-order={order}>
      {task.title}
    </div>
  ),
}));

// FormCreateNew — minimal stub
vi.mock("../form-create-new", () => ({
  default: () => <div data-testid="form-create-new" />,
}));

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnDragEnd = undefined;
});

describe("Subtask", () => {
  describe("rendering", () => {
    it("renders all subtask items", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      const items = screen.getAllByTestId("subtask-item");
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent("First subtask");
      expect(items[1]).toHaveTextContent("Second subtask");
      expect(items[2]).toHaveTextContent("Third subtask");
    });

    it("passes correct order indices to items", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveAttribute("data-order", "0");
      expect(items[1]).toHaveAttribute("data-order", "1");
      expect(items[2]).toHaveAttribute("data-order", "2");
    });
  });

  describe("drag reorder", () => {
    it("reorders items and calls reorder mutation when dragging first to third", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      // Simulate dragging sub-1 (index 0) to sub-3 (index 2)
      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "sub-1" },
            target: { id: "sub-3" },
          },
        });
      });

      // After reorder: sub-2, sub-3, sub-1 → sub-1 spliced out then inserted at index 2
      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveTextContent("Second subtask");
      expect(items[1]).toHaveTextContent("Third subtask");
      expect(items[2]).toHaveTextContent("First subtask");

      expect(mockReorderMutate).toHaveBeenCalledWith({
        taskId: "task-1",
        subtaskId: "sub-1",
        position: 2,
      });
    });

    it("reorders items and calls reorder mutation when dragging third to first", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      // Simulate dragging sub-3 (index 2) to sub-1 (index 0)
      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "sub-3" },
            target: { id: "sub-1" },
          },
        });
      });

      // After reorder: sub-3 spliced out then inserted at index 0 → sub-3, sub-1, sub-2
      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveTextContent("Third subtask");
      expect(items[1]).toHaveTextContent("First subtask");
      expect(items[2]).toHaveTextContent("Second subtask");

      expect(mockReorderMutate).toHaveBeenCalledWith({
        taskId: "task-1",
        subtaskId: "sub-3",
        position: 0,
      });
    });

    it("does not call mutation when source or target is missing", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "sub-1" },
            target: null,
          },
        });
      });

      expect(mockReorderMutate).not.toHaveBeenCalled();

      // Items should remain in original order
      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveTextContent("First subtask");
      expect(items[1]).toHaveTextContent("Second subtask");
      expect(items[2]).toHaveTextContent("Third subtask");
    });

    it("does not call mutation when source id is not found in list", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "unknown-id" },
            target: { id: "sub-1" },
          },
        });
      });

      expect(mockReorderMutate).not.toHaveBeenCalled();
    });

    it("does not call mutation when drag is canceled", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      act(() => {
        capturedOnDragEnd?.({
          canceled: true,
          operation: {
            source: { id: "sub-1" },
            target: { id: "sub-3" },
          },
        });
      });

      expect(mockReorderMutate).not.toHaveBeenCalled();

      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveTextContent("First subtask");
      expect(items[1]).toHaveTextContent("Second subtask");
      expect(items[2]).toHaveTextContent("Third subtask");
    });

    it("does not call mutation when dropped on same item", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "sub-2" },
            target: { id: "sub-2" },
          },
        });
      });

      expect(mockReorderMutate).not.toHaveBeenCalled();
    });

    it("reorders adjacent items correctly", () => {
      render(<Subtask taskId="task-1" teamId={1} />);

      // Swap sub-1 and sub-2
      act(() => {
        capturedOnDragEnd?.({
          canceled: false,
          operation: {
            source: { id: "sub-1" },
            target: { id: "sub-2" },
          },
        });
      });

      const items = screen.getAllByTestId("subtask-item");
      expect(items[0]).toHaveTextContent("Second subtask");
      expect(items[1]).toHaveTextContent("First subtask");
      expect(items[2]).toHaveTextContent("Third subtask");

      expect(mockReorderMutate).toHaveBeenCalledWith({
        taskId: "task-1",
        subtaskId: "sub-1",
        position: 1,
      });
    });
  });
});
