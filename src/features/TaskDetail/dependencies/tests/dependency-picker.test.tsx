import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DependencyPicker from "../dependency-picker";
import { addTaskDependencies } from "@/services/dependency.service";
import { HttpError } from "@/lib/http-client";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreOptimisticActivities } from "@/stores/use-store-optimistic-activities";
import { createColumn, createTask } from "@/test-factories";
import { createQueryWrapper, makeDependencies, makeDependencyTask } from "./test-utils";

vi.mock("@/services/dependency.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Radix-portal stub (repo convention); exposes the controlled `open` state.
vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="popover-root" data-open={String(open)}>
      <button type="button" data-testid="popover-toggle" onClick={() => onOpenChange?.(!open)} />
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const TASK_ID = "task-current";

// The native <select> is also a combobox with options — query by name/within listbox.
function searchInput() {
  return screen.getByRole("combobox", { name: "Search tasks" });
}

function candidateOptions() {
  return within(screen.getByRole("listbox")).queryAllByRole("option");
}

function seedBoard() {
  const backlog = createColumn(1, "Backlog", "#94a3b8");
  backlog.tasks = [
    createTask({ id: TASK_ID, ticket_id: "KAN-1", title: "Current task" }),
    createTask({ id: "t-pay", ticket_id: "KAN-2", title: "Set up payment provider" }),
    createTask({ id: "t-linked", ticket_id: "KAN-3", title: "Already linked" }),
  ];
  const review = createColumn(2, "In Review", "#6366f1");
  review.tasks = [createTask({ id: "t-legal", ticket_id: "KAN-4", title: "Legal approval" })];
  useStoreKanbanBoard.setState({ kanbanBoard: { columns: [backlog, review] } });
}

function renderPicker() {
  const { wrapper } = createQueryWrapper();
  const dependencies = makeDependencies({
    blocked_by: [makeDependencyTask({ id: "t-linked", ticket_id: "KAN-3", title: "Already linked" })],
  });
  return render(<DependencyPicker taskId={TASK_ID} dependencies={dependencies} />, { wrapper });
}

beforeEach(() => {
  seedBoard();
  vi.mocked(addTaskDependencies).mockResolvedValue(makeDependencies());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  useStoreOptimisticActivities.setState({ activities: new Map() });
});

describe("DependencyPicker", () => {
  it("offers board tasks but never the task itself or already-linked ones", () => {
    renderPicker();

    const names = candidateOptions().map((option) => option.textContent);
    expect(names.some((name) => name?.includes("Set up payment provider"))).toBe(true);
    expect(names.some((name) => name?.includes("Legal approval"))).toBe(true);
    expect(names.some((name) => name?.includes("Current task"))).toBe(false);
    expect(names.some((name) => name?.includes("Already linked"))).toBe(false);
  });

  it("filters candidates by title or ticket id", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(searchInput(), "legal");
    expect(candidateOptions()).toHaveLength(1);
    expect(candidateOptions()[0]).toHaveTextContent("Legal approval");

    await user.clear(searchInput());
    await user.type(searchInput(), "kan-2");
    expect(candidateOptions()).toHaveLength(1);
    expect(candidateOptions()[0]).toHaveTextContent("Set up payment provider");
  });

  it("shows an announced empty message outside the listbox when nothing matches", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(searchInput(), "zzz-no-match");
    expect(candidateOptions()).toHaveLength(0);
    // Must sit outside the listbox (options-only children) and be announced.
    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent("No matching tasks");
    expect(screen.getByRole("listbox")).not.toContainElement(empty);
  });

  it("marks the search input as a list-filtering combobox", () => {
    renderPicker();
    expect(searchInput()).toHaveAttribute("aria-autocomplete", "list");
  });

  it("clicking a candidate links it as a blocker of the current task", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(
      within(screen.getByRole("listbox")).getByRole("option", { name: /Set up payment provider/ }),
    );

    await waitFor(() =>
      expect(addTaskDependencies).toHaveBeenCalledWith(TASK_ID, ["t-pay"]),
    );
  });

  it("in the Blocking direction the request goes to the picked task instead", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.selectOptions(screen.getByRole("combobox", { name: "Relation type" }), "blocks");
    await user.click(
      within(screen.getByRole("listbox")).getByRole("option", { name: /Set up payment provider/ }),
    );

    await waitFor(() =>
      expect(addTaskDependencies).toHaveBeenCalledWith("t-pay", [TASK_ID]),
    );
  });

  it("logs an optimistic activity only when adding in the blocked_by direction", async () => {
    const user = userEvent.setup();
    renderPicker();
    const optimisticEntries = () =>
      useStoreOptimisticActivities.getState().activities.get(TASK_ID) ?? [];

    // Default direction (blocked_by): activity lands on this task's feed.
    await user.click(
      within(screen.getByRole("listbox")).getByRole("option", { name: /Set up payment provider/ }),
    );
    await waitFor(() =>
      expect(optimisticEntries().map((entry) => entry.action)).toEqual(["task_dependency_added"]),
    );

    // "Blocking": the activity is recorded on the OTHER task — nothing here.
    await user.selectOptions(screen.getByRole("combobox", { name: "Relation type" }), "blocks");
    await user.click(
      within(screen.getByRole("listbox")).getByRole("option", { name: /Legal approval/ }),
    );
    await waitFor(() => expect(addTaskDependencies).toHaveBeenCalledTimes(2));
    expect(optimisticEntries()).toHaveLength(1);
  });

  it("stays open when the server rejects the link and closes on a successful add", async () => {
    vi.mocked(addTaskDependencies)
      .mockRejectedValueOnce(
        new HttpError(409, "POST /tasks/x/dependencies failed with status 409", {
          statusCode: 409,
          message: 'Adding "KAN-2" would create a dependency cycle',
        }),
      )
      .mockResolvedValueOnce(makeDependencies());
    const user = userEvent.setup();
    renderPicker();

    const root = screen.getByTestId("popover-root");
    await user.click(screen.getByTestId("popover-toggle"));
    expect(root).toHaveAttribute("data-open", "true");

    const payment = () =>
      within(screen.getByRole("listbox")).getByRole("option", { name: /Set up payment provider/ });

    // 409: no phantom close — the user can fix their pick.
    await user.click(payment());
    await waitFor(() => expect(addTaskDependencies).toHaveBeenCalledTimes(1));
    expect(root).toHaveAttribute("data-open", "true");

    // Success: closes.
    await user.click(payment());
    await waitFor(() => expect(root).toHaveAttribute("data-open", "false"));
  });

  it("scrolls the newly active option into view on arrow-key navigation", async () => {
    const scrollSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    renderPicker();

    await user.click(searchInput());
    await user.keyboard("{ArrowDown}");

    // Focus stays on the input (activedescendant), so the option must be scrolled manually.
    const active = within(screen.getByRole("listbox")).getByRole("option", { name: /Legal approval/ });
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
    expect(scrollSpy.mock.contexts.at(-1)).toBe(active);
    scrollSpy.mockRestore();
  });

  it("supports keyboard: ArrowDown moves the active option and Enter picks it", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(searchInput());
    await user.keyboard("{ArrowDown}{Enter}");

    // Candidates in board order: [t-pay, t-legal]; ArrowDown moves 0 → 1.
    await waitFor(() =>
      expect(addTaskDependencies).toHaveBeenCalledWith(TASK_ID, ["t-legal"]),
    );
  });
});
