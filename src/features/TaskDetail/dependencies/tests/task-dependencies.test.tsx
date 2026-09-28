import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TaskDependencies from "..";
import { getTaskDependencies, removeTaskDependencies } from "@/services/dependency.service";
import { getProjectMembers } from "@/services/project.service";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreOptimisticActivities } from "@/stores/use-store-optimistic-activities";
import { useStoreUser } from "@/stores/use-store-user";
import { createColumn } from "@/test-factories";
import type { IProjectMembersResponse } from "@/types";
import { createQueryWrapper, makeDependencies, makeDependencyTask } from "./test-utils";

vi.mock("@/services/dependency.service");
vi.mock("@/services/project.service");

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const PROJECT_ID = "project-1";
const TASK_ID = "task-current";
const CURRENT_USER = {
  id: "user-1",
  email: "user@example.com",
  full_name: "Test User",
  role: "frontend_developer",
  avatar_url: "",
};

function membersResponse(role: string): IProjectMembersResponse {
  return {
    data: [
      {
        project_id: PROJECT_ID,
        user_id: CURRENT_USER.id,
        role,
        joined_at: "2026-01-01T00:00:00Z",
        user: { ...CURRENT_USER, is_active: true, created_at: "", updated_at: "" },
      },
    ],
    status: 200,
    success: true,
  };
}

function seedStores() {
  useStoreUser.setState({ user: CURRENT_USER });
  useStoreKanbanBoard.setState({
    kanbanBoard: {
      columns: [createColumn(1, "Backlog", "#94a3b8"), createColumn(4, "Done", "#22c55e")],
    },
  });
}

function renderDependencies() {
  const { wrapper } = createQueryWrapper();
  return render(<TaskDependencies taskId={TASK_ID} projectId={PROJECT_ID} />, { wrapper });
}

beforeEach(() => {
  seedStores();
  vi.mocked(getProjectMembers).mockResolvedValue(membersResponse("member"));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreUser.setState({ user: null });
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  useStoreOptimisticActivities.setState({ activities: new Map() });
});

describe("TaskDependencies", () => {
  it("renders both groups with each linked task's ticket and title", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: "KAN-12", title: "Design schema" })],
        blocks: [makeDependencyTask({ id: "t-b", ticket_id: "KAN-19", title: "Ship the API" })],
      }),
    );

    renderDependencies();

    expect(await screen.findByText("Blocked by")).toBeInTheDocument();
    expect(screen.getByText("Blocks")).toBeInTheDocument();
    expect(screen.getByText("KAN-12")).toBeInTheDocument();
    expect(screen.getByText("Design schema")).toBeInTheDocument();
    expect(screen.getByText("KAN-19")).toBeInTheDocument();
    expect(screen.getByText("Ship the API")).toBeInTheDocument();
  });

  it("hides a group with no entries and strikes through done tasks", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [
          makeDependencyTask({ id: "t-done", ticket_id: "KAN-7", title: "Legal approval", status: "done" }),
        ],
      }),
    );

    renderDependencies();

    expect(await screen.findByText("Blocked by")).toBeInTheDocument();
    expect(screen.queryByText("Blocks")).not.toBeInTheDocument();
    expect(screen.getByText("Legal approval")).toHaveClass("line-through");
  });

  it("shows a quiet empty state when there are no dependencies", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(makeDependencies());

    renderDependencies();

    expect(await screen.findByText("No dependencies")).toBeInTheDocument();
  });

  it("navigates to the linked task when its row is clicked", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: "KAN-12", title: "Design schema" })],
      }),
    );
    const user = userEvent.setup();

    renderDependencies();

    await user.click(await screen.findByRole("button", { name: /Design schema/ }));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId: PROJECT_ID, taskId: "KAN-12" },
    });
  });

  it("renders an entry without a ticket id as plain text, not a link", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: null, title: "Orphan task" })],
      }),
    );

    renderDependencies();

    expect(await screen.findByText("Orphan task")).toBeInTheDocument();
    // Exact name — /Orphan task/ would also match "Remove link to Orphan task".
    expect(screen.queryByRole("button", { name: "Orphan task" })).not.toBeInTheDocument();
  });

  it("lets a member remove a dependency, addressed by the blocked task", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocks: [makeDependencyTask({ id: "t-b", ticket_id: "KAN-19", title: "Ship the API" })],
      }),
    );
    vi.mocked(removeTaskDependencies).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderDependencies();

    await user.click(await screen.findByRole("button", { name: "Remove link to KAN-19" }));
    // "current blocks t-b" → DELETE addressed to t-b, body = current task.
    await waitFor(() =>
      expect(removeTaskDependencies).toHaveBeenCalledWith("t-b", [TASK_ID]),
    );
  });

  it("logs an optimistic removal activity only for the blocked_by direction", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: "KAN-12", title: "Design schema" })],
        blocks: [makeDependencyTask({ id: "t-b", ticket_id: "KAN-19", title: "Ship the API" })],
      }),
    );
    vi.mocked(removeTaskDependencies).mockResolvedValue(undefined);
    const user = userEvent.setup();
    const optimisticEntries = () =>
      useStoreOptimisticActivities.getState().activities.get(TASK_ID) ?? [];

    renderDependencies();

    // Removing "this blocks KAN-19": activity is recorded on the OTHER task.
    await user.click(await screen.findByRole("button", { name: "Remove link to KAN-19" }));
    await waitFor(() => expect(removeTaskDependencies).toHaveBeenCalledTimes(1));
    expect(optimisticEntries()).toHaveLength(0);

    // Removing a blocker: activity lands on this task's feed.
    await user.click(screen.getByRole("button", { name: "Remove link to KAN-12" }));
    await waitFor(() =>
      expect(optimisticEntries().map((entry) => entry.action)).toEqual(["task_dependency_removed"]),
    );
  });

  it("stays read-only while the current user is not in the members list", async () => {
    const stranger = { ...membersResponse("member") };
    stranger.data = [
      {
        ...stranger.data[0],
        user_id: "someone-else",
        user: { ...stranger.data[0].user, id: "someone-else" },
      },
    ];
    vi.mocked(getProjectMembers).mockResolvedValue(stranger);
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: "KAN-12", title: "Design schema" })],
      }),
    );

    renderDependencies();

    expect(await screen.findByText("KAN-12")).toBeInTheDocument();
    await waitFor(() => expect(getProjectMembers).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Add dependency/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove link/ })).not.toBeInTheDocument();
  });

  it("shows the add control to members", async () => {
    vi.mocked(getTaskDependencies).mockResolvedValue(makeDependencies());

    renderDependencies();

    expect(await screen.findByRole("button", { name: /Add dependency/ })).toBeInTheDocument();
  });

  it("withholds the add control until the lists have loaded", async () => {
    // While the GET is pending the picker can't know what's already linked.
    let resolveGet: () => void = () => {};
    vi.mocked(getTaskDependencies).mockImplementation(
      () => new Promise((resolve) => { resolveGet = () => resolve(makeDependencies()); }),
    );

    renderDependencies();

    // Flush the members query so canEdit is true and only the deps gate remains.
    await waitFor(() => expect(getProjectMembers).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("button", { name: /Add dependency/ })).not.toBeInTheDocument();

    resolveGet();
    expect(await screen.findByRole("button", { name: /Add dependency/ })).toBeInTheDocument();
  });

  it("hides add and remove controls from viewers", async () => {
    vi.mocked(getProjectMembers).mockResolvedValue(membersResponse("viewer"));
    vi.mocked(getTaskDependencies).mockResolvedValue(
      makeDependencies({
        blocked_by: [makeDependencyTask({ id: "t-a", ticket_id: "KAN-12", title: "Design schema" })],
      }),
    );

    renderDependencies();

    expect(await screen.findByText("KAN-12")).toBeInTheDocument();
    await waitFor(() => expect(getProjectMembers).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Add dependency/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove link/ })).not.toBeInTheDocument();
  });
});
