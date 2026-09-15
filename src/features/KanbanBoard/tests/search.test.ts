import { describe, expect, it } from "vitest";

import { isDoneColumn, searchPhase, searchTasks, segments, snippet, stripHtml } from "../search";
import { createColumn, createTask } from "@/test-factories";
import type { IBoard, IColumn, ITask } from "@/types";

function makeBoard(...columns: IColumn[]): IBoard {
  return { columns };
}

function withTasks(column: IColumn, tasks: ITask[]): IColumn {
  return { ...column, tasks };
}

const inProgress = () => createColumn(1, "In Progress", "#6366f1");
const backlog = () => createColumn(2, "Backlog", "#94a3b8");
const done = () => createColumn(3, "Done", "#10b981");

const invitationTask = () =>
  createTask({
    id: "t1",
    ticket_id: "KAN-131",
    title: "Implement Project Invitation Flow",
    description: "<p>Invite teammates by email with expiring links.</p>",
  });

const paletteTask = () =>
  createTask({
    id: "t2",
    ticket_id: "KAN-104",
    title: "Command Palette",
    description: "<p>Global palette to jump to tasks and actions.</p>",
  });

describe("searchTasks", () => {
  it("returns no results for an empty or whitespace query", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask()]));

    expect(searchTasks(board, "")).toEqual([]);
    expect(searchTasks(board, "   ")).toEqual([]);
  });

  it("finds a card by a word in its title", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask(), paletteTask()]));

    const results = searchTasks(board, "invitation");

    expect(results).toHaveLength(1);
    expect(results[0].task.title).toBe("Implement Project Invitation Flow");
    expect(results[0].column.name).toBe("In Progress");
  });

  it("finds the invitation card via partial and imprecise queries (acceptance examples)", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask(), paletteTask()]));

    for (const query of ["invitation", "project invite", "implement project"]) {
      const results = searchTasks(board, query);
      expect(results[0]?.task.title, `query: ${query}`).toBe(
        "Implement Project Invitation Flow",
      );
    }
  });

  it("tolerates a typo inside a word (palete finds Command Palette)", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask(), paletteTask()]));

    const results = searchTasks(board, "palete");

    expect(results).toHaveLength(1);
    expect(results[0].task.title).toBe("Command Palette");
  });

  it("finds a card by its ticket id", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask(), paletteTask()]));

    const results = searchTasks(board, "kan-104");

    expect(results[0]?.task.ticket_id).toBe("KAN-104");
  });

  it("finds a card by label name", () => {
    const labelled = createTask({
      id: "t3",
      ticket_id: "KAN-9",
      title: "Fix aspect ratio",
      labels: [{ id: "l1", name: "Frontend", color: "#3b82f6", created_at: "", updated_at: "" }],
    });
    const board = makeBoard(withTasks(inProgress(), [labelled, paletteTask()]));

    const results = searchTasks(board, "frontend");

    expect(results).toHaveLength(1);
    expect(results[0].task.id).toBe("t3");
  });

  it("finds cards by their column name", () => {
    const board = makeBoard(
      withTasks(backlog(), [paletteTask()]),
      withTasks(inProgress(), [invitationTask()]),
    );

    const results = searchTasks(board, "backlog");

    expect(results).toHaveLength(1);
    expect(results[0].task.id).toBe("t2");
  });

  it("matches HTML descriptions as plain text and reports the description field", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask()]));

    const results = searchTasks(board, "expiring links");

    expect(results).toHaveLength(1);
    expect(results[0].matchedField).toBe("description");
  });

  it("reports the title field when the title matched", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask()]));

    expect(searchTasks(board, "invitation")[0]?.matchedField).toBe("title");
  });

  it("requires every token to match somewhere", () => {
    const board = makeBoard(withTasks(inProgress(), [invitationTask()]));

    expect(searchTasks(board, "invitation zebra")).toEqual([]);
  });

  it("ranks completed cards below open ones", () => {
    const openTask = createTask({ id: "open", ticket_id: "KAN-1", title: "Ship search" });
    const doneTask = createTask({ id: "done", ticket_id: "KAN-2", title: "Ship search" });
    const board = makeBoard(
      withTasks(done(), [doneTask]),
      withTasks(inProgress(), [openTask]),
    );

    const results = searchTasks(board, "ship search");

    expect(results.map((r) => r.task.id)).toEqual(["open", "done"]);
  });

  it("orders results best match first", () => {
    const exact = createTask({ id: "exact", ticket_id: "KAN-3", title: "Search overlay" });
    const inDescription = createTask({
      id: "desc",
      ticket_id: "KAN-4",
      title: "Board polish",
      description: "<p>Also touches the search overlay entry point.</p>",
    });
    const board = makeBoard(withTasks(inProgress(), [inDescription, exact]));

    const results = searchTasks(board, "search overlay");

    expect(results.map((r) => r.task.id)).toEqual(["exact", "desc"]);
  });

  it("caps the result list at 40", () => {
    const tasks = Array.from({ length: 45 }, (_, i) =>
      createTask({ id: `t${i}`, ticket_id: `KAN-${i}`, title: `Search item ${i}` }),
    );
    const board = makeBoard(withTasks(inProgress(), tasks));

    expect(searchTasks(board, "search")).toHaveLength(40);
  });
});

describe("segments", () => {
  it("returns one unhighlighted segment for an empty query", () => {
    expect(segments("Command Palette", "")).toEqual([{ text: "Command Palette", hit: false }]);
  });

  it("marks exact token matches, case-insensitively", () => {
    expect(segments("Implement Project Invitation Flow", "project")).toEqual([
      { text: "Implement ", hit: false },
      { text: "Project", hit: true },
      { text: " Invitation Flow", hit: false },
    ]);
  });

  it("highlights the whole word a near-miss token matched, never scattered letters", () => {
    expect(segments("Command Palette", "palete")).toEqual([
      { text: "Command ", hit: false },
      { text: "Palette", hit: true },
    ]);
  });
});

describe("snippet", () => {
  it("returns an empty string when there is no description", () => {
    expect(snippet("", "anything")).toBe("");
  });

  it("excerpts around the first matching token with ellipses", () => {
    const longDescription = `<p>${"lead ".repeat(30)}the expiring links are rotated nightly ${"tail ".repeat(30)}</p>`;

    const result = snippet(longDescription, "expiring");

    expect(result).toContain("expiring links");
    expect(result.startsWith("…")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("<p>");
  });

  it("falls back to the leading text when no token matches", () => {
    const result = snippet(`<p>${"word ".repeat(60)}</p>`, "zebra");

    expect(result.length).toBeLessThanOrEqual(129);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("isDoneColumn", () => {
  it("treats done-style column names as completed", () => {
    for (const name of ["Done", "done", "Completed", "Complete", "Closed"]) {
      expect(isDoneColumn(name), name).toBe(true);
    }
  });

  it("treats other columns as open", () => {
    for (const name of ["In Progress", "Backlog", "In Review", "Doneish topics"]) {
      expect(isDoneColumn(name), name).toBe(false);
    }
  });
});

describe("searchPhase", () => {
  it("is idle for an empty or whitespace query, whatever the deferred value", () => {
    expect(searchPhase({ query: "", deferredQuery: "old", resultCount: 3, failed: false })).toBe("idle");
    expect(searchPhase({ query: "   ", deferredQuery: "", resultCount: 0, failed: false })).toBe("idle");
  });

  // The anti-flash contract: while the deferred query lags the typed query,
  // existing results stay on screen instead of being swapped for a
  // "Searching…" row on every keystroke.
  it("keeps showing stale results while the deferred query catches up", () => {
    expect(searchPhase({ query: "palette", deferredQuery: "palett", resultCount: 1, failed: false })).toBe(
      "results",
    );
  });

  it("shows the searching row only when lagging with nothing to show", () => {
    expect(searchPhase({ query: "p", deferredQuery: "", resultCount: 0, failed: false })).toBe("searching");
  });

  it("keeps the empty state mounted while typing continues past a no-match query", () => {
    // The empty body names the query it actually searched (the deferred one),
    // so keeping it is honest — swapping to a "Searching…" row per keystroke
    // flashed empty ↔ searching while typing.
    expect(searchPhase({ query: "zzzz", deferredQuery: "zzz", resultCount: 0, failed: false })).toBe(
      "empty",
    );
  });

  it("keeps the error body while typing continues past a failed query", () => {
    expect(searchPhase({ query: "pal", deferredQuery: "pa", resultCount: 0, failed: true })).toBe(
      "error",
    );
  });

  it("settles into results, empty, or error once caught up", () => {
    expect(searchPhase({ query: "palette", deferredQuery: "palette", resultCount: 2, failed: false })).toBe(
      "results",
    );
    expect(searchPhase({ query: "zzzz", deferredQuery: "zzzz", resultCount: 0, failed: false })).toBe(
      "empty",
    );
    expect(searchPhase({ query: "pal", deferredQuery: "pal", resultCount: 0, failed: true })).toBe("error");
  });
});

describe("typo-tolerance rejection thresholds", () => {
  // These pin the tuned heart of the fuzzy matching: an in-order subsequence
  // that is too scattered must NOT count as a near-miss.
  it("rejects scattered in-word subsequences", () => {
    const board = makeBoard(
      withTasks(inProgress(), [
        createTask({ id: "t1", ticket_id: "KAN-1", title: "Personalization settings" }),
      ]),
    );

    // "pon" is an in-order subsequence of "personalization" (p…o-n) but far
    // too loose (tight 0.5 < 0.6) to be a real near-miss.
    expect(searchTasks(board, "pon")).toEqual([]);
  });

  it("rejects tokens longer than every word in the card", () => {
    const board = makeBoard(
      withTasks(inProgress(), [
        createTask({ id: "t1", ticket_id: "KAN-1", title: "Personalization settings" }),
      ]),
    );

    expect(searchTasks(board, "settingsplus")).toEqual([]);
  });
});

describe("stripHtml", () => {
  it("decodes common HTML entities and collapses whitespace", () => {
    expect(stripHtml("<p>Fish &amp; chips&nbsp;menu</p>")).toBe("Fish & chips menu");
  });
});

describe("snippet short-description path", () => {
  it("returns a short description whole, without ellipsis", () => {
    expect(snippet("<p>Short text</p>", "zebra")).toBe("Short text");
  });
});

describe("search-doc caching", () => {
  it("returns fresh results for a new board snapshot", () => {
    const first = makeBoard(
      withTasks(inProgress(), [createTask({ id: "t1", ticket_id: "K-1", title: "Alpha" })]),
    );
    expect(searchTasks(first, "alpha")).toHaveLength(1);

    const second = makeBoard(
      withTasks(inProgress(), [createTask({ id: "t1", ticket_id: "K-1", title: "Beta" })]),
    );
    expect(searchTasks(second, "alpha")).toEqual([]);
    expect(searchTasks(second, "beta")).toHaveLength(1);
  });

  it("serves repeated queries against the same board snapshot consistently", () => {
    const board = makeBoard(
      withTasks(inProgress(), [createTask({ id: "t1", ticket_id: "K-1", title: "Alpha" })]),
    );

    expect(searchTasks(board, "alpha")).toHaveLength(1);
    expect(searchTasks(board, "alpha")).toHaveLength(1);
  });
});
