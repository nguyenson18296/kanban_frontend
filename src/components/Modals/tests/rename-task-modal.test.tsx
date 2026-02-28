import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import RenameTaskModal from "../rename-task-modal";
import { createTask } from "@/test-factories";

// --- Mocks ---

const mockMutate = vi.fn();
const mockUpdateTaskTitle = vi.fn();
const mockOnOpenChange = vi.fn();

vi.mock("@/features/KanbanBoard/hooks/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: mockMutate }),
}));

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ updateTaskTitle: mockUpdateTaskTitle }),
}));

// Mock Dialog primitives so we can test logic without Radix portals/focus-trap.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("radix-ui", () => ({
  VisuallyHidden: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}));

// --- Helpers ---

function renderModal(overrides: Parameters<typeof createTask>[0] = {}) {
  const task = createTask(overrides);
  return render(
    <RenameTaskModal task={task} open={true} onOpenChange={mockOnOpenChange} />,
  );
}

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RenameTaskModal", () => {
  it("renders nothing when open is false", () => {
    const task = createTask();
    render(
      <RenameTaskModal task={task} open={false} onOpenChange={mockOnOpenChange} />,
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("renders input pre-filled with task title", () => {
    renderModal({ title: "My Task" });

    expect(screen.getByRole("textbox")).toHaveValue("My Task");
  });

  it("renders rename row showing the current input value", () => {
    renderModal({ title: "My Task" });

    expect(screen.getByText(/Rename task to/)).toBeInTheDocument();
    expect(screen.getByText('"My Task"')).toBeInTheDocument();
  });

  it("renders Cancel button and keyboard hints", () => {
    renderModal();

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("esc")).toBeInTheDocument();
  });

  it("updates input value when typing", async () => {
    const user = userEvent.setup();
    renderModal({ title: "Old Title" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "New Title");

    expect(input).toHaveValue("New Title");
    expect(screen.getByText('"New Title"')).toBeInTheDocument();
  });

  it("submits on Enter key with changed title", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-42", title: "Old Title" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    // {Enter} is special key in testing-library/user-event
    await user.type(input, "New Title{Enter}");

    expect(mockUpdateTaskTitle).toHaveBeenCalledWith("task-42", "New Title");
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      task: { title: "New Title" },
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits on clicking the rename row", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-42", title: "Old Title" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Updated");

    await user.click(screen.getByText(/Rename task to/).closest("button")!);

    expect(mockUpdateTaskTitle).toHaveBeenCalledWith("task-42", "Updated");
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      task: { title: "Updated" },
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without saving when clicking Cancel", async () => {
    const user = userEvent.setup();
    renderModal({ title: "My Task" });

    await user.click(screen.getByText("Cancel").closest("button")!);

    expect(mockUpdateTaskTitle).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("skips update when title is unchanged", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-42", title: "Same Title" });

    const input = screen.getByRole("textbox");
    // Type and then restore original value
    await user.type(input, "x");
    await user.type(input, "{Backspace}");
    await user.type(input, "{Enter}");

    expect(mockUpdateTaskTitle).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("skips update when title is only whitespace", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-42", title: "My Task" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "   {Enter}");

    expect(mockUpdateTaskTitle).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("trims whitespace from title before submitting", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-42", title: "Old" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "  New Title  {Enter}");

    expect(mockUpdateTaskTitle).toHaveBeenCalledWith("task-42", "New Title");
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      task: { title: "New Title" },
    });
  });

  it("applies optimistic store update before firing mutation", async () => {
    const user = userEvent.setup();
    renderModal({ id: "task-1", title: "Old" });

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "New{Enter}");

    const storeCallOrder = mockUpdateTaskTitle.mock.invocationCallOrder[0];
    const mutateCallOrder = mockMutate.mock.invocationCallOrder[0];
    expect(storeCallOrder).toBeLessThan(mutateCallOrder);
  });
});
