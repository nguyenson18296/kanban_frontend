import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AssigneeSubmenu from "../assignee-submenu";
import { createAssignee, createTask, createUser } from "@/test-factories";
import type { IUser } from "@/types";

// --- Mocks ---

const mockMutate = vi.fn();
const mockUpdateStoreAssignees = vi.fn();

vi.mock("@/components/AssigneeDropdown/hooks/use-update-assignees", () => ({
  useUpdateAssignees: () => ({ mutate: mockMutate }),
}));

let mockUsers: IUser[] = [];

vi.mock("@/stores/use-store-users-list", () => ({
  useStoreUsersList: (selector: (state: { users: IUser[] }) => unknown) =>
    selector({ users: mockUsers }),
}));

vi.mock("@/stores/use-store-kanban-board", () => ({
  useStoreKanbanBoard: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ updateTaskAssignees: mockUpdateStoreAssignees }),
}));

// Mock Radix context menu primitives as simple elements so we can
// test component logic without fighting Radix's pointer/timer internals.
vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuSub: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="sub-root" data-onopenchange={onOpenChange ? "true" : undefined}>
      {children}
      {/* Expose buttons to simulate opening/closing the submenu */}
      {onOpenChange && (
        <>
          <button type="button" data-testid="open-submenu" onClick={() => onOpenChange(true)}>
            Open
          </button>
          <button type="button" data-testid="close-submenu" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </>
      )}
    </div>
  ),
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
    onSelect?: (e: Event) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        const fakeEvent = { preventDefault: vi.fn() } as unknown as Event;
        onSelect?.(fakeEvent);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) => {
    const { ref, ...rest } = props;
    return <input {...rest} ref={ref} />;
  },
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  AvatarImage: ({ src }: { src?: string }) => (
    src ? <img src={src} alt="" /> : null
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

// --- Helpers ---

const users = [
  createUser({ id: "u-1", full_name: "Alice Smith", avatar_url: "https://example.com/alice.png" }),
  createUser({ id: "u-2", full_name: "Bob Jones", avatar_url: "https://example.com/bob.png" }),
  createUser({ id: "u-3", full_name: "Charlie Brown", avatar_url: "" }),
];

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AssigneeSubmenu", () => {
  it("renders the Assignee trigger with an icon", () => {
    mockUsers = users;
    render(<AssigneeSubmenu task={createTask()} />);

    expect(screen.getByText("Assignee")).toBeInTheDocument();
    expect(screen.getByTestId("sub-trigger").querySelector("svg")).toBeInTheDocument();
  });

  it("renders all users from the store", () => {
    mockUsers = users;
    render(<AssigneeSubmenu task={createTask()} />);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  it("shows check icon for currently assigned users", () => {
    mockUsers = users;
    const task = createTask({
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Alice's row should contain a check icon (svg)
    const aliceButton = screen.getByText("Alice Smith").closest("button")!;
    expect(aliceButton.querySelector("svg")).toBeInTheDocument();

    // Bob's row should NOT contain a check icon
    const bobButton = screen.getByText("Bob Jones").closest("button")!;
    expect(bobButton.querySelector("svg")).not.toBeInTheDocument();
  });

  it("toggles a user on click — adds check for unassigned user", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    render(<AssigneeSubmenu task={createTask()} />);

    // Click Bob to assign
    await user.click(screen.getByText("Bob Jones").closest("button")!);

    // Bob should now have a check icon
    const bobButton = screen.getByText("Bob Jones").closest("button")!;
    expect(bobButton.querySelector("svg")).toBeInTheDocument();
  });

  it("toggles a user on click — removes check for assigned user", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Alice is assigned — click to unassign
    await user.click(screen.getByText("Alice Smith").closest("button")!);

    // Alice should no longer have a check icon
    const aliceButton = screen.getByText("Alice Smith").closest("button")!;
    expect(aliceButton.querySelector("svg")).not.toBeInTheDocument();
  });

  it("filters users by search input", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    render(<AssigneeSubmenu task={createTask()} />);

    const searchInput = screen.getByPlaceholderText("Assign to...");
    await user.type(searchInput, "alice");

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    render(<AssigneeSubmenu task={createTask()} />);

    const searchInput = screen.getByPlaceholderText("Assign to...");
    await user.type(searchInput, "BOB");

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("calls updateAssignees mutation when submenu closes", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Toggle Bob on
    await user.click(screen.getByText("Bob Jones").closest("button")!);

    // Simulate closing the submenu
    await user.click(screen.getByTestId("close-submenu"));

    expect(mockMutate).toHaveBeenCalledOnce();
    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      assignee_ids: expect.arrayContaining(["u-1", "u-2"]),
      previousAssignees: [createAssignee("u-1", "Alice Smith")],
    });
  });

  it("sends only remaining assignees after unassigning one", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [
        createAssignee("u-1", "Alice Smith"),
        createAssignee("u-2", "Bob Jones"),
      ],
    });
    render(<AssigneeSubmenu task={task} />);

    // Unassign Alice
    await user.click(screen.getByText("Alice Smith").closest("button")!);

    // Close to trigger mutation
    await user.click(screen.getByTestId("close-submenu"));

    expect(mockMutate).toHaveBeenCalledWith({
      id: "task-42",
      assignee_ids: ["u-2"],
      previousAssignees: [
        createAssignee("u-1", "Alice Smith"),
        createAssignee("u-2", "Bob Jones"),
      ],
    });
  });

  it("applies optimistic Zustand update before firing mutation", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Toggle Bob on, then close
    await user.click(screen.getByText("Bob Jones").closest("button")!);
    await user.click(screen.getByTestId("close-submenu"));

    // Store should be updated with TAssignee[] built from the users list
    expect(mockUpdateStoreAssignees).toHaveBeenCalledOnce();
    expect(mockUpdateStoreAssignees).toHaveBeenCalledWith("task-42", [
      { id: "u-1", full_name: "Alice Smith", avatar_url: "https://example.com/alice.png" },
      { id: "u-2", full_name: "Bob Jones", avatar_url: "https://example.com/bob.png" },
    ]);

    // Store update should happen before the mutation
    const storeCallOrder = mockUpdateStoreAssignees.mock.invocationCallOrder[0];
    const mutateCallOrder = mockMutate.mock.invocationCallOrder[0];
    expect(storeCallOrder).toBeLessThan(mutateCallOrder);
  });

  it("does not update store when closing with no changes", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    await user.click(screen.getByTestId("close-submenu"));

    expect(mockUpdateStoreAssignees).not.toHaveBeenCalled();
  });

  it("does not call mutation until submenu closes", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    render(<AssigneeSubmenu task={createTask()} />);

    // Toggle some users but don't close
    await user.click(screen.getByText("Alice Smith").closest("button")!);
    await user.click(screen.getByText("Bob Jones").closest("button")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("skips mutation when closing with no changes", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Close without toggling anyone
    await user.click(screen.getByTestId("close-submenu"));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("skips mutation when toggling a user on then off again", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    render(<AssigneeSubmenu task={task} />);

    // Toggle Bob on, then back off — net change is zero
    await user.click(screen.getByText("Bob Jones").closest("button")!);
    await user.click(screen.getByText("Bob Jones").closest("button")!);

    await user.click(screen.getByTestId("close-submenu"));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("renders empty list when no users in store", () => {
    mockUsers = [];
    render(<AssigneeSubmenu task={createTask()} />);

    const content = screen.getByTestId("sub-content");
    // Only the search input wrapper should be present, no user buttons
    expect(content.querySelectorAll("button")).toHaveLength(0);
  });

  it("renders avatar fallback initial for users without avatar", () => {
    mockUsers = [createUser({ id: "u-3", full_name: "Charlie Brown", avatar_url: "" })];
    render(<AssigneeSubmenu task={createTask()} />);

    // Fallback shows first character of full_name
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("re-syncs draft from task.assignees when submenu re-opens", async () => {
    mockUsers = users;
    const user = userEvent.setup();

    // Start with Alice assigned
    const task = createTask({
      id: "task-42",
      assignees: [createAssignee("u-1", "Alice Smith")],
    });
    const { rerender } = render(<AssigneeSubmenu task={task} />);

    // Toggle Bob on, then close (triggers mutation)
    await user.click(screen.getByText("Bob Jones").closest("button")!);
    await user.click(screen.getByTestId("close-submenu"));

    // Simulate external update: task now has Alice + Charlie (not Bob)
    const updatedTask = createTask({
      id: "task-42",
      assignees: [
        createAssignee("u-1", "Alice Smith"),
        createAssignee("u-3", "Charlie Brown"),
      ],
    });
    rerender(<AssigneeSubmenu task={updatedTask} />);

    // Re-open the submenu — draft should reset to the new task.assignees
    await user.click(screen.getByTestId("open-submenu"));

    // Alice and Charlie should be checked, Bob should NOT
    const aliceButton = screen.getByText("Alice Smith").closest("button")!;
    expect(aliceButton.querySelector("svg")).toBeInTheDocument();

    const charlieButton = screen.getByText("Charlie Brown").closest("button")!;
    expect(charlieButton.querySelector("svg")).toBeInTheDocument();

    const bobButton = screen.getByText("Bob Jones").closest("button")!;
    expect(bobButton.querySelector("svg")).not.toBeInTheDocument();
  });

  it("clears search input when submenu re-opens", async () => {
    mockUsers = users;
    const user = userEvent.setup();
    render(<AssigneeSubmenu task={createTask()} />);

    // Type a search query
    const searchInput = screen.getByPlaceholderText("Assign to...");
    await user.type(searchInput, "alice");
    expect(searchInput).toHaveValue("alice");

    // Close and re-open the submenu
    await user.click(screen.getByTestId("close-submenu"));
    await user.click(screen.getByTestId("open-submenu"));

    // Search should be cleared
    expect(screen.getByPlaceholderText("Assign to...")).toHaveValue("");
    // All users should be visible again
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });
});
