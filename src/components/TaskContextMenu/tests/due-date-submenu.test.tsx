import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import DueDateSubmenu from "../due-date-submenu";
import { createTask } from "@/test-factories";
import { DUE_DATE_OPTIONS } from "@/utils/date";

// --- Mocks ---

const mockMutate = vi.fn();
const mockUpdateTaskDueDate = vi.fn();
const mockOnEditCustomDueDate = vi.fn();

vi.mock("@/features/KanbanBoard/hooks/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: mockMutate }),
}));

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ updateTaskDueDate: mockUpdateTaskDueDate }),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sub-trigger">{children}</div>
  ),
  ContextMenuSubContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sub-content">{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DueDateSubmenu", () => {
  it("renders the Due date trigger with an icon", () => {
    render(
      <DueDateSubmenu task={createTask()} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    expect(screen.getByText("Due date")).toBeInTheDocument();
    expect(screen.getByTestId("sub-trigger").querySelector("svg")).toBeInTheDocument();
  });

  it("renders Custom option and all due date options", () => {
    render(
      <DueDateSubmenu task={createTask()} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    expect(screen.getByText("Custom...")).toBeInTheDocument();
    for (const option of DUE_DATE_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it("calls onEditCustomDueDate with the task when Custom is clicked", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-99" });
    render(
      <DueDateSubmenu task={task} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    await user.click(screen.getByText("Custom..."));

    expect(mockOnEditCustomDueDate).toHaveBeenCalledOnce();
    expect(mockOnEditCustomDueDate).toHaveBeenCalledWith(task);
  });

  it("does not call store or mutation when Custom is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DueDateSubmenu task={createTask()} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    await user.click(screen.getByText("Custom..."));

    expect(mockUpdateTaskDueDate).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("updates store and fires mutation when selecting a due date option", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-42" });
    render(
      <DueDateSubmenu task={task} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    await user.click(screen.getByText("Tomorrow"));

    expect(mockUpdateTaskDueDate).toHaveBeenCalledOnce();
    expect(mockUpdateTaskDueDate).toHaveBeenCalledWith(
      "task-42",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );

    expect(mockMutate).toHaveBeenCalledOnce();
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      task: { due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) },
    });
  });

  it("applies optimistic store update before firing mutation", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-1" });
    render(
      <DueDateSubmenu task={task} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    await user.click(screen.getByText("Today"));

    const storeCallOrder = mockUpdateTaskDueDate.mock.invocationCallOrder[0];
    const mutateCallOrder = mockMutate.mock.invocationCallOrder[0];
    expect(storeCallOrder).toBeLessThan(mutateCallOrder);
  });

  it("each option has an icon", () => {
    render(
      <DueDateSubmenu task={createTask()} onEditCustomDueDate={mockOnEditCustomDueDate} />,
    );

    const content = screen.getByTestId("sub-content");
    const buttons = content.querySelectorAll("button");

    // Custom + DUE_DATE_OPTIONS
    expect(buttons).toHaveLength(1 + DUE_DATE_OPTIONS.length);
    for (const button of buttons) {
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
  });
});
