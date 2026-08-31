import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ProjectSwitcher from "..";
import * as projectService from "@/services/project.service";
import { useStoreActiveProject } from "@/stores/use-store-active-project";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { IProject } from "@/types";

vi.mock("@/services/project.service");
const mocked = vi.mocked(projectService);

const mockNavigate = vi.fn();
let pathname = "/dashboard";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname }),
  useNavigate: () => mockNavigate,
}));

// The Radix portal/menu behavior is not under test — stub it so the menu
// content renders inline (repo convention for Radix-portal primitives).
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" data-testid="menu-item" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

function makeProject(overrides: Partial<IProject> = {}): IProject {
  return {
    id: "p1",
    name: "Flowboard Core",
    tag: "FBC",
    description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const TWO_PROJECTS = [
  makeProject(),
  makeProject({ id: "p2", name: "Design System", tag: "DS" }),
];

function renderSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProjectSwitcher />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

beforeEach(() => {
  pathname = "/dashboard";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreActiveProject.setState({ activeProjectId: null });
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  window.localStorage.clear();
});

describe("ProjectSwitcher", () => {
  it("shows the stored active project in the trigger", async () => {
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "p2" });
    renderSwitcher();

    expect(
      await screen.findByRole("button", { name: /Switch project — current: Design System/ }),
    ).toBeInTheDocument();
  });

  it("falls back to the first project when nothing is stored", async () => {
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    renderSwitcher();

    expect(
      await screen.findByRole("button", { name: /Switch project — current: Flowboard Core/ }),
    ).toBeInTheDocument();
  });

  it("lists every project and marks only the active one as current", async () => {
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    renderSwitcher();

    const menu = await screen.findByTestId("menu");
    const items = within(menu).getAllByTestId("menu-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Flowboard Core");
    expect(items[0]).toHaveTextContent("(current project)");
    expect(items[1]).toHaveTextContent("Design System");
    expect(items[1]).not.toHaveTextContent("(current project)");
  });

  it("switching from a project-agnostic page updates the context without navigating", async () => {
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    useStoreKanbanBoard.setState({ kanbanBoard: { columns: [] } });
    const user = userEvent.setup();
    const { queryClient } = renderSwitcher();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const menu = await screen.findByTestId("menu");
    await user.click(within(menu).getByRole("button", { name: /Design System/ }));

    expect(useStoreActiveProject.getState().activeProjectId).toBe("p2");
    // Stale board data from the previous project is cleared and refetched.
    expect(useStoreKanbanBoard.getState().kanbanBoard).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["board"], refetchType: "none" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("switching from a project route navigates to the new project's board", async () => {
    pathname = "/projects/p1/tasks/t42";
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    const user = userEvent.setup();
    renderSwitcher();

    const menu = await screen.findByTestId("menu");
    await user.click(within(menu).getByRole("button", { name: /Design System/ }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "p2" },
    });
  });

  it("selecting the current project is a no-op", async () => {
    pathname = "/projects/p1";
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    useStoreKanbanBoard.setState({ kanbanBoard: { columns: [] } });
    const user = userEvent.setup();
    renderSwitcher();

    const menu = await screen.findByTestId("menu");
    await user.click(within(menu).getByRole("button", { name: /Flowboard Core/ }));

    expect(useStoreActiveProject.getState().activeProjectId).toBe("p1");
    expect(useStoreKanbanBoard.getState().kanbanBoard).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("repairs a stale stored id when selecting the shown fallback project", async () => {
    mocked.getProjects.mockResolvedValue(TWO_PROJECTS);
    useStoreActiveProject.setState({ activeProjectId: "deleted-id" });
    const user = userEvent.setup();
    renderSwitcher();

    // The fallback (first project) is shown as current; clicking it writes
    // the real id to the store without clearing/navigating.
    const menu = await screen.findByTestId("menu");
    await user.click(within(menu).getByRole("button", { name: /Flowboard Core/ }));

    expect(useStoreActiveProject.getState().activeProjectId).toBe("p1");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows a loading placeholder while projects load", () => {
    mocked.getProjects.mockReturnValue(new Promise(() => {}));
    renderSwitcher();

    expect(screen.getByRole("status", { name: "Loading projects" })).toBeInTheDocument();
  });

  it("shows the empty state when the user has no projects", async () => {
    mocked.getProjects.mockResolvedValue([]);
    renderSwitcher();

    expect(await screen.findByText("No projects yet.")).toBeInTheDocument();
  });

  it("shows the error state when projects fail to load", async () => {
    mocked.getProjects.mockRejectedValue(new Error("boom"));
    renderSwitcher();

    expect(await screen.findByText("Couldn't load projects.")).toBeInTheDocument();
  });

  it("still renders a working switcher when the user has a single project", async () => {
    mocked.getProjects.mockResolvedValue([makeProject()]);
    renderSwitcher();

    expect(
      await screen.findByRole("button", { name: /Switch project — current: Flowboard Core/ }),
    ).toBeInTheDocument();
    const menu = screen.getByTestId("menu");
    const items = within(menu).getAllByTestId("menu-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("(current project)");
    expect(screen.queryByLabelText("Search projects")).not.toBeInTheDocument();
  });

  it("filters the list through the search input on large project lists", async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeProject({ id: `p${i + 1}`, name: `Project ${i + 1}`, tag: `T${i + 1}` }),
    );
    mocked.getProjects.mockResolvedValue(many);
    const user = userEvent.setup();
    renderSwitcher();

    const input = await screen.findByLabelText("Search projects");
    const menu = screen.getByTestId("menu");
    expect(within(menu).getAllByTestId("menu-item")).toHaveLength(8);

    await user.type(input, "Project 3");
    expect(within(menu).getAllByTestId("menu-item")).toHaveLength(1);
    expect(within(menu).getByTestId("menu-item")).toHaveTextContent("Project 3");

    await user.clear(input);
    await user.type(input, "zzz");
    expect(within(menu).queryAllByTestId("menu-item")).toHaveLength(0);
    expect(within(menu).getByText(/No projects match/)).toBeInTheDocument();
  });
});
