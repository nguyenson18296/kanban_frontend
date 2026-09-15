import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BoardSearch from "../board-search";
import { searchTasks } from "../search";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreRecentTasks } from "@/stores/use-store-recent-tasks";
import { createColumn, createTask } from "@/test-factories";
import type { IBoard } from "@/types";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: navigateMock }),
}));

// Spy wrapper so one test can simulate a failing search; delegates to the real
// implementation by default.
vi.mock("../search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../search")>();
  return { ...actual, searchTasks: vi.fn(actual.searchTasks) };
});

const board = (): IBoard => ({
  columns: [
    {
      ...createColumn(1, "In Progress", "#6366f1"),
      tasks: [
        createTask({
          id: "t1",
          ticket_id: "KAN-131",
          title: "Implement Project Invitation Flow",
          description: "<p>Invite teammates by email with expiring links.</p>",
          priority: "high",
          labels: [{ id: "l1", name: "Frontend", color: "#3b82f6", created_at: "", updated_at: "" }],
          assignees: [{ id: "u1", full_name: "Ava Chen", avatar_url: "" }],
        }),
        createTask({
          id: "t2",
          ticket_id: "KAN-104",
          title: "Command Palette",
          description: "<p>Global palette to jump to tasks.</p>",
          priority: "medium",
        }),
      ],
    },
    {
      ...createColumn(2, "Done", "#10b981"),
      tasks: [createTask({ id: "t3", ticket_id: "KAN-90", title: "Ship search analytics", priority: "low" })],
    },
  ],
});

const onReveal = vi.fn();

function renderSearch() {
  return render(<BoardSearch projectId="p1" onReveal={onReveal} />);
}

async function openViaButton(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /search tasks/i }));
  return screen.getByRole("combobox", { name: /search tasks/i });
}

beforeEach(() => {
  useStoreKanbanBoard.setState({ kanbanBoard: board() });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  useStoreRecentTasks.setState({ recentByProject: {} });
  window.localStorage.clear();
});

describe("BoardSearch opening", () => {
  it("shows a toolbar trigger with the shortcut hint", () => {
    renderSearch();

    const trigger = screen.getByRole("button", { name: /search tasks/i });
    expect(trigger).toHaveTextContent(/⌘F|Ctrl F/);
  });

  it("opens focused on the input when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);

    expect(screen.getByRole("dialog", { name: /search tasks/i })).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("opens via Cmd/Ctrl+F", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.keyboard("{Meta>}f{/Meta}");

    expect(screen.getByRole("dialog", { name: /search tasks/i })).toBeInTheDocument();
  });

  it("selects the existing query instead of closing when the shortcut is pressed again", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "palette");
    await user.keyboard("{Meta>}f{/Meta}");

    expect(screen.getByRole("dialog", { name: /search tasks/i })).toBeInTheDocument();
    const field = input as HTMLInputElement;
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe("palette".length);
  });

  it("leaves Shift+Cmd/Ctrl+F to the browser's native find", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.keyboard("{Meta>}{Shift>}f{/Shift}{/Meta}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSearch();

    await openViaButton(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search tasks/i })).toHaveFocus();
  });
});

describe("BoardSearch before typing", () => {
  it("lists recently opened cards that still exist on the board, plus an explainer", async () => {
    useStoreRecentTasks.setState({ recentByProject: { p1: ["KAN-104", "KAN-999"] } });
    const user = userEvent.setup();
    renderSearch();

    await openViaButton(user);

    expect(screen.getByText(/recently opened/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /command palette/i })).toBeInTheDocument();
    expect(screen.queryByText("KAN-999")).not.toBeInTheDocument();
    expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();
  });

  it("returns to the recent-cards view when the input is cleared", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "palette");
    expect(await screen.findByRole("listbox", { name: /search results/i })).toBeInTheDocument();

    await user.clear(input);

    expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("BoardSearch results", () => {
  it("shows matching cards with count, highlight, ticket id, column, priority and labels", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "invitation");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    const option = within(listbox).getByRole("option");
    expect(option).toHaveTextContent("Implement Project Invitation Flow");
    expect(option).toHaveTextContent("KAN-131");
    expect(option).toHaveTextContent("In Progress");
    expect(option).toHaveTextContent(/high/i);
    expect(option).toHaveTextContent("Frontend");
    const marks = [...listbox.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks.join(" ")).toMatch(/invitation/i);
    expect(screen.getByRole("status")).toHaveTextContent("1 result");
  });

  it("shows a description excerpt only for cards matched on their description", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "expiring");

    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getByTestId("search-result-excerpt")).toHaveTextContent(/expiring links/i);

    await user.clear(input);
    await user.type(input, "palette");
    await screen.findByRole("listbox", { name: /search results/i });
    expect(screen.queryByTestId("search-result-excerpt")).not.toBeInTheDocument();
  });

  it("says what was searched when nothing matches, with a nudge", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "zzzz");

    expect(await screen.findByText(/no cards match/i)).toHaveTextContent("zzzz");
    expect(screen.getByText(/fewer words|ticket id/i)).toBeInTheDocument();
  });

  it("shows a retryable error state when search itself fails, without touching the board", async () => {
    vi.mocked(searchTasks).mockImplementation(() => {
      throw new Error("index down");
    });
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "palette");

    expect(await screen.findByText(/search is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/board is unaffected/i)).toBeInTheDocument();

    // mockReset restores the real implementation given to vi.fn in the factory.
    vi.mocked(searchTasks).mockReset();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByRole("listbox", { name: /search results/i })).toBeInTheDocument();
  });
});

describe("BoardSearch keyboard navigation", () => {
  async function openWithThreeResults(user: ReturnType<typeof userEvent.setup>) {
    const input = await openViaButton(user);
    await user.type(input, "kan");
    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    return { input, listbox };
  }

  const selectedTitles = (listbox: HTMLElement) =>
    within(listbox)
      .getAllByRole("option")
      .filter((o) => o.getAttribute("aria-selected") === "true")
      .map((o) => o.textContent);

  it("moves the highlight with arrows, wrapping at the ends", async () => {
    const user = userEvent.setup();
    renderSearch();
    const { listbox } = await openWithThreeResults(user);

    expect(selectedTitles(listbox).join(" ")).toContain("Implement Project Invitation Flow");

    await user.keyboard("{ArrowDown}");
    expect(selectedTitles(listbox).join(" ")).toContain("Command Palette");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(selectedTitles(listbox).join(" ")).toContain("Implement Project Invitation Flow");

    await user.keyboard("{ArrowUp}");
    expect(selectedTitles(listbox).join(" ")).toContain("Ship search analytics");
  });

  it("jumps to first and last with Home and End", async () => {
    const user = userEvent.setup();
    renderSearch();
    const { listbox } = await openWithThreeResults(user);

    await user.keyboard("{End}");
    expect(selectedTitles(listbox).join(" ")).toContain("Ship search analytics");

    await user.keyboard("{Home}");
    expect(selectedTitles(listbox).join(" ")).toContain("Implement Project Invitation Flow");
  });

  it("highlights the row under the mouse so keyboard and mouse agree", async () => {
    const user = userEvent.setup();
    renderSearch();
    const { listbox } = await openWithThreeResults(user);

    await user.hover(within(listbox).getAllByRole("option")[1]);

    expect(selectedTitles(listbox).join(" ")).toContain("Command Palette");
  });
});

describe("BoardSearch choosing a result", () => {
  it("opens the highlighted card with Enter and records it as recent", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "invitation");
    await screen.findByRole("listbox", { name: /search results/i });
    await user.keyboard("{Enter}");

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId: "p1", taskId: "KAN-131" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useStoreRecentTasks.getState().recentByProject.p1?.[0]).toBe("KAN-131");
  });

  it("opens a card on click", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "palette");
    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    await user.click(within(listbox).getByRole("option"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId: "p1", taskId: "KAN-104" },
    });
  });

  it("reveals the highlighted card on the board with Shift+Enter", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "invitation");
    await screen.findByRole("listbox", { name: /search results/i });
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onReveal).toHaveBeenCalledWith("t1");
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reveals via the Reveal action on the highlighted row", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = await openViaButton(user);
    await user.type(input, "invitation");
    const listbox = await screen.findByRole("listbox", { name: /search results/i });
    await user.click(within(listbox).getByText("Reveal"));

    expect(onReveal).toHaveBeenCalledWith("t1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a recent card from the idle view", async () => {
    useStoreRecentTasks.setState({ recentByProject: { p1: ["KAN-104"] } });
    const user = userEvent.setup();
    renderSearch();

    await openViaButton(user);
    await user.click(screen.getByRole("button", { name: /command palette/i }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId: "p1", taskId: "KAN-104" },
    });
  });
});

describe("BoardSearch a11y and input hardening", () => {
  it("restores focus to the trigger without scrolling it into view", async () => {
    const user = userEvent.setup();
    renderSearch();
    await openViaButton(user);

    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    try {
      await user.keyboard("{Escape}");

      expect(screen.getByRole("button", { name: /search tasks/i })).toHaveFocus();
      // Scrolling the trigger back into view would undo the reveal scroll.
      expect(focusSpy.mock.calls.some((call) => call[0]?.preventScroll === true)).toBe(true);
    } finally {
      focusSpy.mockRestore();
    }
  });

  it("keeps the Reveal affordance out of the tab order and a11y tree", async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = await openViaButton(user);
    await user.type(input, "invitation");
    const listbox = await screen.findByRole("listbox", { name: /search results/i });

    // Children of role="option" are presentational to ARIA anyway; the button
    // is a mouse-only affordance — Shift+Enter is the accessible path.
    const reveal = within(listbox).getByText("Reveal").closest("button");
    expect(reveal).toHaveAttribute("tabindex", "-1");
    expect(reveal).toHaveAttribute("aria-hidden", "true");
  });

  it("reflects the real popup state in the combobox ARIA", async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = await openViaButton(user);

    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-controls");

    await user.type(input, "palette");
    await screen.findByRole("listbox", { name: /search results/i });

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", "board-search-listbox");
  });

  it("ignores Enter while an IME composition is in progress", async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = await openViaButton(user);
    await user.type(input, "invitation");
    await screen.findByRole("listbox", { name: /search results/i });

    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /search tasks/i })).toBeInTheDocument();
  });

  it("yields Cmd/Ctrl+F when another surface already claimed it", async () => {
    renderSearch();

    window.addEventListener("keydown", (e) => e.preventDefault(), { capture: true, once: true });
    fireEvent.keyDown(document.body, { key: "f", metaKey: true, cancelable: true });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
