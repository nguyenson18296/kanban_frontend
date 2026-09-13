import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import KanbanBoard from "../index";
import { useBoardRoom } from "../hooks/use-board-room";
import * as boardService from "@/services/board.service";
import { HttpError } from "@/lib/http-client";
import { useStoreActiveProject } from "@/stores/use-store-active-project";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { createColumn } from "@/test-factories";
import type { IBoard } from "@/types";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ projectId: "p1" }),
  Link: ({ children }: { children: ReactNode }) => <a href="/dashboard">{children}</a>,
}));
vi.mock("../hooks/use-board-room", () => ({ useBoardRoom: vi.fn() }));
vi.mock("@/services/board.service");
// The drag-and-drop surface is not under test — stub the flaky primitives.
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@dnd-kit/helpers", () => ({ move: vi.fn() }));
vi.mock("../column", () => ({
  default: ({ title }: { title: string }) => <div data-testid="column">{title}</div>,
}));

const mockedBoardService = vi.mocked(boardService);
const mockedUseBoardRoom = vi.mocked(useBoardRoom);

const notFound404 = () =>
  new HttpError(404, "GET /board/p1 failed", {
    statusCode: 404,
    message: 'Project with id "p1" not found',
  });

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreActiveProject.setState({ activeProjectId: null });
  useStoreKanbanBoard.setState({ kanbanBoard: null });
  window.localStorage.clear();
});

describe("KanbanBoard", () => {
  it("shows the not-found state when the board room subscription is denied", () => {
    // Denial masks "no access" and "does not exist" alike — even a pending or
    // successful HTTP fetch must not override it.
    mockedBoardService.getBoard.mockResolvedValue({ columns: [] } satisfies IBoard);
    mockedUseBoardRoom.mockReturnValue("denied");

    render(<KanbanBoard />, { wrapper });

    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    expect(screen.queryByText("Loading board...")).not.toBeInTheDocument();
  });

  it("shows the same not-found state when the board API answers 404", async () => {
    mockedBoardService.getBoard.mockRejectedValue(notFound404());
    mockedUseBoardRoom.mockReturnValue("joining");

    render(<KanbanBoard />, { wrapper });

    expect(await screen.findByText(/project not found/i)).toBeInTheDocument();
  });

  it("renders the board once loaded and the room is joined", async () => {
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    mockedBoardService.getBoard.mockResolvedValue({
      columns: [createColumn(1, "To Do", "#e2e8f0")],
    } satisfies IBoard);
    mockedUseBoardRoom.mockReturnValue("joined");

    render(<KanbanBoard />, { wrapper });

    expect(await screen.findByTestId("column")).toHaveTextContent("To Do");
    expect(screen.queryByText(/project not found/i)).not.toBeInTheDocument();
  });

  it("shows an error state with a retry action on a non-404 failure", async () => {
    mockedBoardService.getBoard.mockRejectedValue(
      new HttpError(500, "GET /board/p1 failed", { statusCode: 500, message: "boom" }),
    );
    mockedUseBoardRoom.mockReturnValue("joining");

    render(<KanbanBoard />, { wrapper });

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load the board.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText(/project not found/i)).not.toBeInTheDocument();
  });
});
