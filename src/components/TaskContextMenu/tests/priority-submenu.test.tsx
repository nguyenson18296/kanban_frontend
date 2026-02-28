import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PrioritySubmenu from "../priority-submenu";
import { createTask } from "@/test-factories";
import { PRIORITY_OPTIONS } from "@/constants/priority";

// --- Mocks ---

const mockMutate = vi.fn();
const mockUpdateTaskPriority = vi.fn();

vi.mock("@/features/KanbanBoard/hooks/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: mockMutate }),
}));

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ updateTaskPriority: mockUpdateTaskPriority }),
}));

// Mock Radix context menu primitives as simple elements so we can
// test component logic without fighting Radix's pointer/timer internals.
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

describe("PrioritySubmenu", () => {
  it("renders the Priority trigger with an icon", () => {
    render(<PrioritySubmenu task={createTask()} />);

    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByTestId("sub-trigger").querySelector("svg")).toBeInTheDocument();
  });

  it("renders all priority options", () => {
    render(<PrioritySubmenu task={createTask()} />);

    for (const option of PRIORITY_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it("shows check icon for the task's current priority", () => {
    render(<PrioritySubmenu task={createTask({ priority: "high" })} />);

    const highButton = screen.getByText("High").closest("button")!;
    // Check icon (svg) count: priority icon + check icon = 2 svgs
    expect(highButton.querySelectorAll("svg")).toHaveLength(2);

    // Other options should only have 1 svg (the priority icon)
    const lowButton = screen.getByText("Low").closest("button")!;
    expect(lowButton.querySelectorAll("svg")).toHaveLength(1);
  });

  it("updates store and fires mutation when selecting a different priority", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-42", priority: "medium" });
    render(<PrioritySubmenu task={task} />);

    await user.click(screen.getByText("Urgent"));

    expect(mockUpdateTaskPriority).toHaveBeenCalledOnce();
    expect(mockUpdateTaskPriority).toHaveBeenCalledWith("task-42", "urgent");

    expect(mockMutate).toHaveBeenCalledOnce();
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      task: { priority: "urgent" },
    });
  });

  it("applies optimistic store update before firing mutation", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-1", priority: "low" });
    render(<PrioritySubmenu task={task} />);

    await user.click(screen.getByText("High"));

    const storeCallOrder = mockUpdateTaskPriority.mock.invocationCallOrder[0];
    const mutateCallOrder = mockMutate.mock.invocationCallOrder[0];
    expect(storeCallOrder).toBeLessThan(mutateCallOrder);
  });

  it("skips update when selecting the current priority", async () => {
    const user = userEvent.setup();
    const task = createTask({ id: "task-42", priority: "medium" });
    render(<PrioritySubmenu task={task} />);

    await user.click(screen.getByText("Medium"));

    expect(mockUpdateTaskPriority).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("each priority option has an icon", () => {
    render(<PrioritySubmenu task={createTask({ priority: "no_priority" })} />);

    const content = screen.getByTestId("sub-content");
    const buttons = content.querySelectorAll("button");

    expect(buttons).toHaveLength(PRIORITY_OPTIONS.length);
    for (const button of buttons) {
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
  });
});
