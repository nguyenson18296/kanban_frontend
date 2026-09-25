import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SEARCH_PAGE_SIZE, useSearchTasks } from "../use-search-tasks";
import { searchTasksAllProjects } from "@/services/search.service";
import type { IResponse, ITaskSearchHit } from "@/types";

vi.mock("@/services/search.service");

function makeHit(overrides: Partial<ITaskSearchHit> = {}): ITaskSearchHit {
  return {
    id: "task-1",
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
    project_id: "p1",
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
    meta: { page: 1, limit: SEARCH_PAGE_SIZE, total: hits.length, totalPages: 1, ...meta },
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSearchTasks", () => {
  it("fetches the first page and exposes flattened hits plus the server total", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(
      makePage([makeHit({ id: "t1" }), makeHit({ id: "t2" })], { total: 3, totalPages: 2 }),
    );

    const { result } = renderHook(() => useSearchTasks("login"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchTasksAllProjects).toHaveBeenCalledWith("login", 1, SEARCH_PAGE_SIZE, expect.any(AbortSignal));
    expect(result.current.data?.hits.map((hit) => hit.id)).toEqual(["t1", "t2"]);
    expect(result.current.data?.total).toBe(3);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("does not call the API for a blank or whitespace-only query", async () => {
    const { result } = renderHook(() => useSearchTasks("   "), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(searchTasksAllProjects).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace before sending", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([]));

    const { result } = renderHook(() => useSearchTasks("  login page  "), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchTasksAllProjects).toHaveBeenCalledWith(
      "login page",
      1,
      SEARCH_PAGE_SIZE,
      expect.any(AbortSignal),
    );
  });

  it("caps the query at 200 code points so the server never rejects it as too long", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([]));

    const { result } = renderHook(() => useSearchTasks("a".repeat(205)), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchTasksAllProjects).toHaveBeenCalledWith(
      "a".repeat(200),
      1,
      SEARCH_PAGE_SIZE,
      expect.any(AbortSignal),
    );
  });

  it("loads the next page while more pages exist, then reports the end", async () => {
    vi.mocked(searchTasksAllProjects)
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "t1" }), makeHit({ id: "t2" })], { total: 3, totalPages: 2 }),
      )
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "t3" })], { page: 2, total: 3, totalPages: 2 }),
      );

    const { result } = renderHook(() => useSearchTasks("login"), { wrapper: createWrapper() });
    // Read `data` and `hasNextPage` up front: react-query only notifies on
    // tracked (previously read) properties, exactly like a rendering component.
    await waitFor(() => expect(result.current.data?.hits).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());

    expect(searchTasksAllProjects).toHaveBeenLastCalledWith(
      "login",
      2,
      SEARCH_PAGE_SIZE,
      expect.any(AbortSignal),
    );
    await waitFor(() =>
      expect(result.current.data?.hits.map((hit) => hit.id)).toEqual(["t1", "t2", "t3"]),
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it("dedupes a hit that drifts onto two pages so React keys stay unique", async () => {
    // Result drift between page fetches can land the same task on both pages.
    vi.mocked(searchTasksAllProjects)
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "t1" }), makeHit({ id: "t2" })], { total: 3, totalPages: 2 }),
      )
      .mockResolvedValueOnce(
        makePage([makeHit({ id: "t2" }), makeHit({ id: "t3" })], {
          page: 2,
          total: 3,
          totalPages: 2,
        }),
      );

    const { result } = renderHook(() => useSearchTasks("login"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data?.hits).toHaveLength(2));

    await act(() => result.current.fetchNextPage());

    await waitFor(() =>
      expect(result.current.data?.hits.map((hit) => hit.id)).toEqual(["t1", "t2", "t3"]),
    );
  });

  it("serves a fresh query from cache when re-enabled instead of refetching (scope flip)", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([makeHit({ id: "t1" })]));

    const { result, rerender } = renderHook(({ q }: { q: string }) => useSearchTasks(q), {
      wrapper: createWrapper(),
      initialProps: { q: "login" },
    });
    await waitFor(() => expect(result.current.data?.hits).toHaveLength(1));

    // Simulate the scope toggle: query drops to "" (disabled), then comes back.
    rerender({ q: "" });
    rerender({ q: "login" });

    await waitFor(() => expect(result.current.data?.hits).toHaveLength(1));
    expect(result.current.isFetching).toBe(false);
    expect(searchTasksAllProjects).toHaveBeenCalledTimes(1);
  });

  it("reports no next page for an empty result (totalPages 0)", async () => {
    vi.mocked(searchTasksAllProjects).mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));

    const { result } = renderHook(() => useSearchTasks("nothing"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hits).toEqual([]);
    expect(result.current.data?.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
  });
});
