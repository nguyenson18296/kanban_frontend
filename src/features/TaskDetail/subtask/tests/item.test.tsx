import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SubtaskItem from "../item";
import { createTask, createAssignee, createColumn } from "@/test-factories";
import type { ITask } from "@/types/task.type";
import type { ILabel } from "@/types";

// --- Mocks ---

const mockUpdateTaskMutate = vi.fn();
const mockUpdateLabelsMutate = vi.fn();

vi.mock("@/features/KanbanBoard/hooks/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: mockUpdateTaskMutate }),
}));

vi.mock("@/features/TaskDetail/hooks/use-update-task-labels", () => ({
  useUpdateTaskLabels: () => ({ mutate: mockUpdateLabelsMutate }),
}));

const columns = [
  createColumn(1, "To Do", "#ff0000"),
  createColumn(2, "In Progress", "#00ff00"),
  createColumn(3, "Done", "#0000ff"),
];

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: { kanbanBoard: { columns: typeof columns } | null }) => unknown) =>
    selector({ kanbanBoard: { columns } }),
}));

// Mock TaskContextMenu — render children and expose callbacks
let capturedOnTaskUpdate: ((partial: Partial<ITask>) => void) | undefined;

vi.mock("@/components/TaskContextMenu", () => ({
  default: ({
    children,
    onTaskUpdate,
  }: {
    children: React.ReactNode;
    onTaskUpdate?: (partial: Partial<ITask>) => void;
  }) => {
    capturedOnTaskUpdate = onTaskUpdate;
    return <div data-testid="context-menu">{children}</div>;
  },
}));

// Mock DueDateDropdown — expose onDueDateChange
let capturedOnDueDateChange: ((date: string | null) => void) | undefined;

vi.mock("@/components/DueDateDropdown", () => ({
  default: ({
    dueDate,
    onDueDateChange,
  }: {
    dueDate: string | null;
    taskId: string;
    onDueDateChange: (date: string | null) => void;
  }) => {
    capturedOnDueDateChange = onDueDateChange;
    return <span data-testid="due-date">{dueDate ?? "No date"}</span>;
  },
}));

// Mock TaskLabelDropdown — expose onLabelsChange and render trigger
let capturedOnLabelsChange: ((labels: ILabel[]) => void) | undefined;

vi.mock("@/components/TaskLabelDropdown", () => ({
  default: ({
    selectedLabels,
    onLabelsChange,
    trigger,
  }: {
    selectedLabels: ILabel[];
    onLabelsChange: (labels: ILabel[]) => void;
    trigger?: React.ReactNode;
  }) => {
    capturedOnLabelsChange = onLabelsChange;
    return (
      <div data-testid="label-dropdown">
        {trigger ?? <button type="button">Add label</button>}
        <span data-testid="label-count">{selectedLabels.length}</span>
      </div>
    );
  },
}));

vi.mock("@/components/TaskLabel/stacked-labels", () => ({
  default: ({ labels }: { labels: ILabel[] }) => (
    <button type="button" data-testid="stacked-labels">
      {labels.map((l) => (
        <span key={l.id}>{l.name}</span>
      ))}
    </button>
  ),
}));

vi.mock("@/components/AvatarGroup", () => ({
  default: ({ avatars }: { avatars: unknown[] }) => (
    <div data-testid="avatar-group">{avatars.length} avatars</div>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" data-testid="checkbox" />,
}));

// --- Helpers ---

function createLabel(id: string, name: string, color: string): ILabel {
  return { id, name, color, created_at: "", updated_at: "" };
}

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnTaskUpdate = undefined;
  capturedOnDueDateChange = undefined;
  capturedOnLabelsChange = undefined;
});

describe("SubtaskItem", () => {
  describe("rendering", () => {
    it("renders the task title", () => {
      render(<SubtaskItem task={createTask({ title: "Fix login bug" })} />);

      expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    });

    it("renders a checkbox", () => {
      render(<SubtaskItem task={createTask()} />);

      expect(screen.getByTestId("checkbox")).toBeInTheDocument();
    });

    it("renders the status color dot based on column_id", () => {
      const { container } = render(
        <SubtaskItem task={createTask({ column_id: 2 })} />,
      );

      const dot = container.querySelector(".rounded-full.size-3");
      expect(dot).toHaveStyle({ backgroundColor: "#00ff00" });
    });

    it("renders assignees in avatar group", () => {
      const task = createTask({
        assignees: [
          createAssignee("u-1", "Alice"),
          createAssignee("u-2", "Bob"),
        ],
      });
      render(<SubtaskItem task={task} />);

      expect(screen.getByText("2 avatars")).toBeInTheDocument();
    });

    it("renders due date dropdown", () => {
      render(<SubtaskItem task={createTask({ due_date: "2026-03-15T00:00:00.000Z" })} />);

      expect(screen.getByTestId("due-date")).toHaveTextContent("2026-03-15");
    });

    it("renders label badges when labels exist", () => {
      const task = createTask({
        labels: [
          createLabel("l-1", "Bug", "#ef4444"),
          createLabel("l-2", "Feature", "#3b82f6"),
        ],
      });
      render(<SubtaskItem task={task} />);

      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Feature")).toBeInTheDocument();
    });
  });

  describe("status change", () => {
    it("updates status color when onTaskUpdate is called with column_id", () => {
      const { container } = render(
        <SubtaskItem task={createTask({ column_id: 1 })} />,
      );

      const dot = container.querySelector(".rounded-full.size-3");
      expect(dot).toHaveStyle({ backgroundColor: "#ff0000" });

      // Simulate status change from context menu
      act(() => capturedOnTaskUpdate?.({ column_id: 3 }));

      expect(dot).toHaveStyle({ backgroundColor: "#0000ff" });
    });
  });

  describe("due date change", () => {
    it("calls updateTaskMutation when due date changes", () => {
      render(<SubtaskItem task={createTask({ id: "task-42", due_date: null })} />);

      act(() => capturedOnDueDateChange?.("2026-04-01T00:00:00.000Z"));

      expect(mockUpdateTaskMutate).toHaveBeenCalledWith({
        id: "task-42",
        task: { due_date: "2026-04-01T00:00:00.000Z" },
      });
    });

    it("skips mutation when due date is unchanged", () => {
      const existingDate = "2026-03-15T00:00:00.000Z";
      render(<SubtaskItem task={createTask({ due_date: existingDate })} />);

      act(() => capturedOnDueDateChange?.(existingDate));

      expect(mockUpdateTaskMutate).not.toHaveBeenCalled();
    });

    it("allows removing due date by passing null", () => {
      render(
        <SubtaskItem
          task={createTask({ id: "task-42", due_date: "2026-03-15T00:00:00.000Z" })}
        />,
      );

      act(() => capturedOnDueDateChange?.(null));

      expect(mockUpdateTaskMutate).toHaveBeenCalledWith({
        id: "task-42",
        task: { due_date: null },
      });
    });

    it("optimistically updates displayed due date", () => {
      render(<SubtaskItem task={createTask({ due_date: null })} />);

      expect(screen.getByTestId("due-date")).toHaveTextContent("No date");

      act(() => capturedOnDueDateChange?.("2026-04-01T00:00:00.000Z"));

      expect(screen.getByTestId("due-date")).toHaveTextContent("2026-04-01");
    });
  });

  describe("labels change", () => {
    it("calls updateTaskLabelsMutation when labels change", () => {
      render(<SubtaskItem task={createTask({ id: "task-42", labels: [] })} />);

      const newLabels = [createLabel("l-1", "Bug", "#ef4444")];
      act(() => capturedOnLabelsChange?.(newLabels));

      expect(mockUpdateLabelsMutate).toHaveBeenCalledWith({
        id: "task-42",
        label_ids: ["l-1"],
      });
    });

    it("skips mutation when label IDs are unchanged", () => {
      const existingLabels = [createLabel("l-1", "Bug", "#ef4444")];
      render(<SubtaskItem task={createTask({ labels: existingLabels })} />);

      const sameLabels = [createLabel("l-1", "Bug", "#ef4444")];
      act(() => capturedOnLabelsChange?.(sameLabels));

      expect(mockUpdateLabelsMutate).not.toHaveBeenCalled();
    });

    it("fires mutation when same count but different IDs", () => {
      const existingLabels = [createLabel("l-1", "Bug", "#ef4444")];
      render(<SubtaskItem task={createTask({ id: "task-42", labels: existingLabels })} />);

      const differentLabels = [createLabel("l-2", "Feature", "#3b82f6")];
      act(() => capturedOnLabelsChange?.(differentLabels));

      expect(mockUpdateLabelsMutate).toHaveBeenCalledWith({
        id: "task-42",
        label_ids: ["l-2"],
      });
    });

    it("optimistically updates displayed label count", () => {
      render(<SubtaskItem task={createTask({ labels: [] })} />);

      expect(screen.getByTestId("label-count")).toHaveTextContent("0");

      const newLabels = [
        createLabel("l-1", "Bug", "#ef4444"),
        createLabel("l-2", "Feature", "#3b82f6"),
      ];
      act(() => capturedOnLabelsChange?.(newLabels));

      expect(screen.getByTestId("label-count")).toHaveTextContent("2");
    });
  });

  describe("assignees change", () => {
    it("updates displayed avatars when onTaskUpdate is called with assignees", () => {
      render(<SubtaskItem task={createTask({ assignees: [] })} />);

      expect(screen.getByText("0 avatars")).toBeInTheDocument();

      act(() =>
        capturedOnTaskUpdate?.({
          assignees: [
            createAssignee("u-1", "Alice"),
            createAssignee("u-2", "Bob"),
          ],
        }),
      );

      expect(screen.getByText("2 avatars")).toBeInTheDocument();
    });
  });
});
