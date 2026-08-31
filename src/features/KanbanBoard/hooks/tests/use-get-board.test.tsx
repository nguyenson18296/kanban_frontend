import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useGetBoard } from "../use-get-board";
import * as boardService from "@/services/board.service";
import { useStoreActiveProject } from "@/stores/use-store-active-project";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { IBoard } from "@/types";

vi.mock("@/services/board.service");
const mocked = vi.mocked(boardService);

const BOARD: IBoard = { columns: [] };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.clearAllMocks();
  useStoreActiveProject.setState({ activeProjectId: null });
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  window.localStorage.clear();
});

describe("useGetBoard", () => {
  it("syncs the store when the fetched board belongs to the active project", async () => {
    mocked.getBoard.mockResolvedValue(BOARD);
    useStoreActiveProject.setState({ activeProjectId: "p1" });

    const { result } = renderHook(() => useGetBoard("p1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useStoreKanbanBoard.getState().kanbanBoard).toEqual(BOARD);
  });

  it("does NOT sync the store when a late response arrives for a non-active project", async () => {
    mocked.getBoard.mockResolvedValue(BOARD);
    // The user already switched away from p1 while this fetch was in flight.
    useStoreActiveProject.setState({ activeProjectId: "p2" });

    const { result } = renderHook(() => useGetBoard("p1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useStoreKanbanBoard.getState().kanbanBoard).toBeNull();
  });
});
