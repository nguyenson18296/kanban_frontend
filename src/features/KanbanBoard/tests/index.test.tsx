import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  default: ({ title, flashTaskId }: { title: string; flashTaskId: string | null }) => (
    <div data-testid="column" data-flash-task={flashTaskId ?? ""}>
      {title}
      <div data-task-id="t1" />
    </div>
  ),
}));
// The search dialog has its own test file — stub it down to its reveal callback.
vi.mock("../board-search", () => ({
  default: ({ onReveal }: { onReveal: (taskId: string) => void }) => (
    <>
      <button type="button" data-testid="board-search" onClick={() => onReveal("t1")}>
        search-stub
      </button>
      <button type="button" data-testid="board-search-weird" onClick={() => onReveal('t"2')}>
        weird-id-stub
      </button>
    </>
  ),
}));

// happy-dom implements scrollIntoView as a no-op — spy to assert reveal scrolling.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

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
  vi.useRealTimers(); // backstop: a timed-out fake-timer test must not leak its clock
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

describe("KanbanBoard search and reveal", () => {
  async function renderLoadedBoard() {
    useStoreActiveProject.setState({ activeProjectId: "p1" });
    mockedBoardService.getBoard.mockResolvedValue({
      columns: [createColumn(1, "To Do", "#e2e8f0")],
    } satisfies IBoard);
    mockedUseBoardRoom.mockReturnValue("joined");
    render(<KanbanBoard />, { wrapper });
    await screen.findByTestId("column");
  }

  it("renders the search entry point in the board toolbar once loaded", async () => {
    await renderLoadedBoard();

    expect(screen.getByTestId("board-search")).toBeInTheDocument();
  });

  it("does not render the search entry point while the board is loading", () => {
    mockedBoardService.getBoard.mockReturnValue(new Promise(() => {}));
    mockedUseBoardRoom.mockReturnValue("joining");

    render(<KanbanBoard />, { wrapper });

    expect(screen.queryByTestId("board-search")).not.toBeInTheDocument();
  });

  it("scrolls to the card and flashes it when search reveals it", async () => {
    const user = userEvent.setup();
    await renderLoadedBoard();

    await user.click(screen.getByTestId("board-search"));

    expect(screen.getByTestId("column")).toHaveAttribute("data-flash-task", "t1");
    expect(scrollSpy).toHaveBeenCalled();
  });

  it("clears the flash outline after a short moment", async () => {
    // Load with real timers (findBy/waitFor don't advance the fake clock),
    // then fake them for the flash duration itself. fireEvent keeps the click
    // synchronous — userEvent's internal delays deadlock under a fake clock.
    await renderLoadedBoard();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByTestId("board-search"));
      expect(screen.getByTestId("column")).toHaveAttribute("data-flash-task", "t1");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.getByTestId("column")).toHaveAttribute("data-flash-task", "");
    } finally {
      vi.useRealTimers();
    }
  });

  it("survives task ids that need CSS escaping when revealing", async () => {
    const user = userEvent.setup();
    await renderLoadedBoard();

    await user.click(screen.getByTestId("board-search-weird"));

    expect(screen.getByTestId("column")).toHaveAttribute("data-flash-task", 't"2');
  });
});
