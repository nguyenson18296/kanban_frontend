import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BoardSearch from "../board-search";
import { SEARCH_PAGE_SIZE } from "../hooks/use-search-tasks";
import { searchTasksAllProjects } from "@/services/search.service";
import { getMyProjects } from "@/services/project.service";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreRecentTasks } from "@/stores/use-store-recent-tasks";
import { createColumn, createTask } from "@/test-factories";
import type { IBoard, IResponse, ITaskSearchHit } from "@/types";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: navigateMock }),
}));

vi.mock("@/services/search.service");
vi.mock("@/services/project.service");

function makeHit(overrides: Partial<ITaskSearchHit> = {}): ITaskSearchHit {
  return {
    id: "hit-1",
    title: "Fix login page",
    description: "Show a helpful error when credentials are invalid.",
    status: "open",
    priority: "high",
    position: 10,
    ticket_id: "KAN-42",
    ticket_number: 42,
    column_id: 1,
    team_id: null,
    assignees: [],
    labels: [],
    due_date: null,
    created_at: "2026-09-12T08:00:00Z",
    updated_at: "2026-09-14T09:30:00Z",
    parent_id: null,
    project_id: "p2",
    snippet: "Fix <mark>login</mark> page",
    ...overrides,
  };
}

function makePage(
  hits: ITaskSearchHit[],
  meta: Partial<IResponse<ITaskSearchHit[]>["meta"]> = {},
): IResponse<ITaskSearchHit[]> {
  return {
    data: hits,
    meta: { page: 1, limit: SEARCH_PAGE_SIZE, total: hits.length, totalPages: hits.length ? 1 : 0, ...meta },
  };
}

const board = (): IBoard => ({
  columns: [
    {
      ...createColumn(1, "In Progress", "#6366f1"),
      tasks: [createTask({ id: "t1", ticket_id: "KAN-1", title: "Local board card" })],
    },
  ],
});

const onReveal = vi.fn();

function renderSearch() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BoardSearch projectId="p1" onReveal={onReveal} />
    </QueryClientProvider>,
  );
}

async function openAllProjects(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /search tasks/i }));
  await user.click(screen.getByRole("radio", { name: /all projects/i }));
  return screen.getByRole("combobox", { name: /search tasks/i });
}

beforeEach(() => {
  useStoreKanbanBoard.setState({ kanbanBoard: board() });
  vi.mocked(getMyProjects).mockResolvedValue({
    data: [
      { id: "p1", name: "Website", tag: "WEB", description: null, created_at: "", updated_at: "" },
      { id: "p2", name: "Mobile App", tag: "MOB", description: null, created_at: "", updated_at: "" },
    ],
    status: 200,
    success: true,
  });
  vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([]));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  useStoreRecentTasks.setState({ recentByProject: {} });
  window.localStorage.clear();
});

describe("BoardSearch all-projects scope", () => {
  it("offers a scope switch and explains the all-projects scope before typing", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);

    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/all your projects/i));
    expect(screen.getByText(/every project you belong to/i)).toBeInTheDocument();
    expect(searchTasksAllProjects).not.toHaveBeenCalled();
  });

  it("debounces typing into a single request for the latest query", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([makeHit()]));
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");

    await screen.findByRole("listbox", { name: /search results/i });
    expect(searchTasksAllProjects).toHaveBeenCalledTimes(1);
    expect(searchTasksAllProjects).toHaveBeenCalledWith("login", 1, SEARCH_PAGE_SIZE, expect.any(AbortSignal));
  });

  it("shows project, ticket, priority, labels, assignees and the highlighted snippet on each hit", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(
      makePage([
        makeHit({
          labels: [{ id: 1, name: "Backend", color: "#f97316", created_at: "", updated_at: "" }],
          assignees: [
            {
              id: "u1",
              email: "ava@example.com",
              full_name: "Ava Chen",
              role: "frontend_developer",
              avatar_url: "",
              is_active: true,
              created_at: "",
              updated_at: "",
            },
          ],
        }),
      ]),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    const option = within(listbox).getByRole("option");
    expect(option).toHaveTextContent("Fix login page");
    expect(option).toHaveTextContent("Mobile App");
    expect(option).toHaveTextContent("KAN-42");
    expect(option).toHaveTextContent("High");
    expect(option).toHaveTextContent("Backend");
    expect(within(option).getByTestId("avatar-group")).toBeInTheDocument();
    const mark = option.querySelector("mark");
    expect(mark).toHaveTextContent("login");
  });

  it("renders snippet markup as inert text segments — hostile HTML never becomes elements", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(
      makePage([
        makeHit({
          snippet:
            'Fix <mark>login</mark> page<img src="x" onerror="document.title=\'pwned\'"><script>document.title="pwned"</script>',
        }),
      ]),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    const option = within(listbox).getByRole("option");
    expect(option.querySelector("mark")).toHaveTextContent("login");
    expect(option.querySelector("img")).toBeNull();
    expect(option.querySelector("script")).toBeNull();
    expect(document.title).not.toBe("pwned");
  });

  it("opens a hit from another project with Enter and records it as recent there", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(
      makePage([makeHit({ project_id: "p2", ticket_id: "KAN-7" })]),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");
    await screen.findByRole("listbox", { name: /search results/i });
    await user.keyboard("{Enter}");

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId: "p2", taskId: "KAN-7" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useStoreRecentTasks.getState().recentByProject.p2?.[0]).toBe("KAN-7");
  });

  it("marks a hit without a ticket id as non-navigable and does not navigate", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(
      makePage([makeHit({ ticket_id: null, ticket_number: null })]),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");
    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getByRole("option")).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");

    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /search tasks/i })).toBeInTheDocument();
  });

  it("never lets an older, slower response overwrite results for the current query", async () => {
    const deferred: Record<string, (page: IResponse<ITaskSearchHit[]>) => void> = {};
    vi.mocked(searchTasksAllProjects).mockImplementation(
      (q) => new Promise((resolve) => { deferred[q] = resolve; }),
    );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "alpha");
    await waitFor(() => expect(deferred.alpha).toBeDefined());
    await user.clear(input);
    await user.type(input, "beta");
    await waitFor(() => expect(deferred.beta).toBeDefined());

    deferred.beta!(makePage([makeHit({ id: "b", title: "Beta hit" })]));
    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getByText("Beta hit")).toBeInTheDocument();

    deferred.alpha!(makePage([makeHit({ id: "a", title: "Alpha hit" })]));
    // Flush the resolved promise before asserting nothing changed.
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0); }); });

    expect(within(listbox).queryByText("Alpha hit")).not.toBeInTheDocument();
    expect(within(listbox).getByText("Beta hit")).toBeInTheDocument();
  });

  it("shows the server total and loads more pages on demand", async () => {
    vi.mocked(searchTasksAllProjects)
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "h1", title: "First login hit" }), makeHit({ id: "h2", title: "Second login hit" })], {
          total: 3,
          totalPages: 2,
        }),
      )
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "h3", title: "Third login hit" })], { page: 2, total: 3, totalPages: 2 }),
      );
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("3 results");

    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(within(listbox).getAllByRole("option")).toHaveLength(3));
    expect(searchTasksAllProjects).toHaveBeenLastCalledWith("login", 2, SEARCH_PAGE_SIZE, expect.any(AbortSignal));
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    // The button unmounted with the last page — focus must return to the input.
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("says nothing matched and mentions whole-word matching", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "zzzz");

    expect(await screen.findByText(/no tasks match/i)).toHaveTextContent("zzzz");
    expect(screen.getByText(/whole word/i)).toBeInTheDocument();
  });

  it("shows a retryable error state and recovers on Try again", async () => {
    vi.mocked(searchTasksAllProjects)
      .mockRejectedValueOnce(new Error("search index down"))
      .mockResolvedValue(makePage([makeHit()]));
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");

    expect(await screen.findByText(/search is unavailable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByRole("listbox", { name: /search results/i })).toBeInTheDocument();
  });

  it("does not re-call the endpoint when flipping scopes with an unchanged query", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([makeHit()]));
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.type(input, "login");
    await screen.findByRole("listbox", { name: /search results/i });
    expect(searchTasksAllProjects).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("radio", { name: /this board/i }));
    await user.click(screen.getByRole("radio", { name: /all projects/i }));

    expect(await screen.findByRole("listbox", { name: /search results/i })).toBeInTheDocument();
    // Let any (wrong) background refetch land before counting.
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0); }); });
    expect(searchTasksAllProjects).toHaveBeenCalledTimes(1);
  });

  it("keeps the client-side board search working after switching back", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openAllProjects(user);
    await user.click(screen.getByRole("radio", { name: /this board/i }));
    await user.type(input, "local board");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getByRole("option")).toHaveTextContent("Local board card");
    expect(searchTasksAllProjects).not.toHaveBeenCalled();
  });
});
