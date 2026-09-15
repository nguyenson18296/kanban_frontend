import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { Link, useParams } from "@tanstack/react-router";

import Column from "./column";
import { useEffect, useRef, useState } from "react";
import type { ITask } from "../../types";

import BoardSearch from "./board-search";

import { useGetBoard } from "./hooks/use-get-board";
import { useBoardRoom } from "./hooks/use-board-room";
import { useMoveTaskToColumn } from "./hooks/use-move-task-to-column";
import { useReorderTask } from "./hooks/use-reorder-task";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { HttpError } from "@/lib/http-client";

// How long a revealed card keeps its outline (JAV-35).
const FLASH_DURATION_MS = 2000;

export default function KanbanBoard() {
  const { projectId } = useParams({ from: "/_authenticated/projects/$projectId/" });
  const { isLoading, error, refetch } = useGetBoard(projectId);
  const boardRoom = useBoardRoom(projectId);
  const kanbanBoard = useStoreKanbanBoard((state) => state.kanbanBoard);

  // "Reveal on board" from search: scroll the card into view and outline it briefly.
  const [flashTaskId, setFlashTaskId] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const handleReveal = (taskId: string) => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    setFlashTaskId(taskId);
    flashTimerRef.current = window.setTimeout(() => {
      setFlashTaskId(null);
      flashTimerRef.current = null;
    }, FLASH_DURATION_MS);

    // The board stays mounted behind the dialog, so the card is queryable
    // right away (the dialog itself closes on this same interaction).
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // CSS.escape keeps unusual ids (quotes, brackets) from breaking the selector.
    const selectorId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(taskId) : taskId;
    document.querySelector(`[data-task-id="${selectorId}"]`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
      inline: "center",
    });
  };

  // The server deliberately gives one masked answer for "no access" and "does
  // not exist" on both channels (HTTP 404 and WS board:join:error) — render
  // the same not-found state for either, and never retry in a loop (JAV-32).
  // role="status" announces the swap when a live board loses access mid-session.
  if (boardRoom === "denied" || (error instanceof HttpError && error.status === 404)) {
    return (
      <div role="status" className="p-8 text-sm text-muted-foreground">
        <p>Project not found. It may have been deleted, or you may not have access.</p>
        <Link to="/dashboard" className="mt-2 inline-block underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Non-404 failure with nothing cached to show: say what happened and offer a
  // retry. (A background-refetch failure with a board already in the store
  // still renders the board.)
  if (error && !kanbanBoard) {
    return (
      <div role="alert" className="p-8 text-sm text-destructive">
        Failed to load the board.{" "}
        <button type="button" className="cursor-pointer underline" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (isLoading || !kanbanBoard) {
    return <div className="p-8 text-sm text-muted-foreground">Loading board...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <BoardSearch projectId={projectId} onReveal={handleReveal} />
      </div>
      <Board board={kanbanBoard} flashTaskId={flashTaskId} />
    </div>
  );
}

function Board({
  board,
  flashTaskId,
}: Readonly<{
  board: NonNullable<ReturnType<typeof useGetBoard>['data']>;
  flashTaskId: string | null;
}>) {
  const columns = board.columns;
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const [items, setItems] = useState<Record<string, ITask[]>>(() =>
    Object.fromEntries(
      columns.map((col) => [col.id, col.tasks])
    )
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    sortedColumns.map((column) => String(column.id))
  );
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  // When not dragging, derive from board so we reflect store updates (e.g. assignee).
  // When dragging, use local items so drag-and-drop state is correct.
  const itemsFromColumns = Object.fromEntries(
    columns.map((col) => [col.id, col.tasks])
  );
  const effectiveItems = draggedTaskId ? items : itemsFromColumns;

  const [sourceColumn, setSourceColumn] = useState<string | null>(null);
  const [sourceTaskPosition, setSourceTaskPosition] = useState<number | null>(null);
  const { mutate: moveTaskToColumnMutation } = useMoveTaskToColumn();
  const { mutate: reorderTaskMutation } = useReorderTask();
  const moveTaskInStore = useStoreKanbanBoard((state) => state.moveTask);
  const reorderTaskInStore = useStoreKanbanBoard((state) => state.reorderTask);

  const activeColumn = draggedTaskId
    ? Object.keys(effectiveItems).find((colId) =>
        effectiveItems[colId].some((t) => t.id === draggedTaskId)
      ) ?? null
    : null;

  // Only highlight the column if the task has moved to a different column
  const dropTargetColumn = activeColumn && activeColumn !== sourceColumn ? activeColumn : null;

  return (
    <DragDropProvider
      onDragStart={(event) => {
        // source information is getting from `useSortable` of Task component
        const { source } = event.operation;
        if (source?.type === "task") {
          setItems(itemsFromColumns);
          setDraggedTaskId(String(source.id));
          const col = Object.keys(itemsFromColumns).find((colId) =>
            itemsFromColumns[colId].some((t) => t.id === String(source.id))
          );
          setSourceColumn(col ?? null);
          const positionInColumn = col === undefined
            ? -1
            : itemsFromColumns[col].findIndex((t) => t.id === String(source.id));
          setSourceTaskPosition(positionInColumn >= 0 ? positionInColumn : null);
        }
      }}
      onDragOver={(event) => {
        const { source } = event.operation;

        if (source?.type === "column") return;
        setItems((items) => move(items, event));
      }}
      onDragEnd={(event) => {
        const { source } = event.operation;
        setDraggedTaskId(null);
        setSourceColumn(null);
        const initialPosition = sourceTaskPosition;
        setSourceTaskPosition(null);

        // Handle column reordering on drag end
        if (!event.canceled && source?.type === "column") {
          setColumnOrder((columns) => move(columns, event));
        }
        if (!event.canceled && source?.type === "task" && draggedTaskId && activeColumn && sourceColumn) {
          const foundIndex = items[activeColumn]?.findIndex((t) => t.id === draggedTaskId) ?? -1;
          const newPosition = Math.max(0, foundIndex);

          if (activeColumn === sourceColumn) {
            if (initialPosition !== null && newPosition !== initialPosition) {
              reorderTaskInStore(Number(activeColumn), draggedTaskId, newPosition);
              reorderTaskMutation({
                id: draggedTaskId,
                position: newPosition,
              });
            }
          } else {
            moveTaskInStore(draggedTaskId, Number(sourceColumn), Number(activeColumn), newPosition);
            moveTaskToColumnMutation({
              id: draggedTaskId,
              columnId: Number(activeColumn),
              position: newPosition,
            });
          }
        }
      }}
    >
      <div className="flex gap-4">
        {columnOrder.map((columnId, columnIndex) => {
          const column = columns.find((c) => String(c.id) === columnId);
          if (!column) return null;
          return (
            <Column
              key={column.id}
              id={column.id}
              title={column.name}
              color={column.color}
              tasks={effectiveItems[String(column.id)] ?? []}
              index={columnIndex}
              isDropTarget={dropTargetColumn === String(column.id)}
              flashTaskId={flashTaskId}
            />
          );
        })}
      </div>
    </DragDropProvider>
  );
}
