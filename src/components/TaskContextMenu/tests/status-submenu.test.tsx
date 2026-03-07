import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StatusSubmenu from "../status-submenu";
import { createColumn } from "@/test-factories";
import type { IColumn } from "@/types/column.type";

// --- Mocks ---

const mockMoveTaskInStore = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      kanbanBoard: getMockBoard(),
      moveTask: mockMoveTaskInStore,
    }),
}));

vi.mock("@/features/KanbanBoard/hooks/use-move-task-to-column", () => ({
  useMoveTaskToColumn: () => ({ mutate: mockMutate }),
}));

// Mock Radix context menu primitives as simple elements so we can
// test our component logic without fighting Radix's pointer/timer internals.
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

// --- Helpers ---

let mockBoard: { columns: IColumn[] } | null = null;
function getMockBoard() {
  return mockBoard;
}

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StatusSubmenu", () => {
  const columns = [
    createColumn(1, "To Do", "#ff0000"),
    createColumn(2, "In Progress", "#00ff00"),
    createColumn(3, "Done", "#0000ff"),
  ];

  beforeEach(() => {
    mockBoard = { columns };
  });

  it("renders the Status trigger with an icon", () => {
    render(<StatusSubmenu id="task-1" column_id={1} />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("sub-trigger").querySelector("svg")).toBeInTheDocument();
  });

  it("shows columns except the task's current column", () => {
    render(<StatusSubmenu id="task-1" column_id={1} />);

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("To Do")).not.toBeInTheDocument();
  });

  it("excludes the correct column when task is in a different column", () => {
    render(<StatusSubmenu id="task-1" column_id={2} />);

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("In Progress")).not.toBeInTheDocument();
  });

  it("calls moveTask store action and mutation when a column is selected", async () => {
    const user = userEvent.setup();
    render(<StatusSubmenu id="task-42" column_id={1} />);

    await user.click(screen.getByText("In Progress"));

    expect(mockMoveTaskInStore).toHaveBeenCalledWith("task-42", 1, 2, 0);
    expect(mockMutate).toHaveBeenCalledWith({ id: "task-42", columnId: 2, position: 0 });
  });

  it("passes position 0 for all moves", async () => {
    const user = userEvent.setup();
    render(<StatusSubmenu id="task-1" column_id={1} />);

    await user.click(screen.getByText("Done"));

    expect(mockMoveTaskInStore).toHaveBeenCalledWith("task-1", 1, 3, 0);
    expect(mockMutate).toHaveBeenCalledWith({ id: "task-1", columnId: 3, position: 0 });
  });

  it("renders no menu items when board is null", () => {
    mockBoard = null;
    render(<StatusSubmenu id="task-1" column_id={1} />);

    const content = screen.getByTestId("sub-content");
    expect(content).toBeEmptyDOMElement();
  });

  it("renders no menu items when the task's column is the only column", () => {
    mockBoard = { columns: [createColumn(1, "To Do", "#ff0000")] };
    render(<StatusSubmenu id="task-1" column_id={1} />);

    const content = screen.getByTestId("sub-content");
    expect(content).toBeEmptyDOMElement();
  });

  it("displays column color indicators", () => {
    render(<StatusSubmenu id="task-1" column_id={1} />);

    const inProgressButton = screen.getByText("In Progress").closest("button")!;
    const colorDot = inProgressButton.querySelector("span");
    expect(colorDot).toHaveStyle({ backgroundColor: "#00ff00" });

    const doneButton = screen.getByText("Done").closest("button")!;
    const doneDot = doneButton.querySelector("span");
    expect(doneDot).toHaveStyle({ backgroundColor: "#0000ff" });
  });
});
