import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";

import Column from "./column";
import { useState } from "react";
import type { ITask } from "../../types";

import { useGetBoard } from "./hooks/use-get-board";
import { useMoveTaskToColumn } from "./hooks/use-move-task-to-column";
import { useReorderTask } from "./hooks/use-reorder-task";

export default function KanbanBoard() {
  const { data: board, isLoading } = useGetBoard();

  if (isLoading || !board) {
    return <div className="p-8 text-sm text-[#64748b]">Loading board...</div>;
  }

  return <Board board={board} />;
}

function Board({ board }: Readonly<{ board: NonNullable<ReturnType<typeof useGetBoard>['data']> }>) {
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
  const [sourceColumn, setSourceColumn] = useState<string | null>(null);
  const [sourceTaskPosition, setSourceTaskPosition] = useState<number | null>(null);
  const { mutate: moveTaskToColumnMutation } = useMoveTaskToColumn();
  const { mutate: reorderTaskMutation } = useReorderTask();

  // Derive activeColumn from current items — always in sync after every render
  const activeColumn = draggedTaskId
    ? Object.keys(items).find((colId) =>
        items[colId].some((t) => t.id === draggedTaskId)
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
          setDraggedTaskId(String(source.id));
          const col = Object.keys(items).find((colId) =>
            items[colId].some((t) => t.id === String(source.id))
          );
          setSourceColumn(col ?? null);
          const positionInColumn = col === undefined
            ? -1
            : items[col].findIndex((t) => t.id === String(source.id));
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
        if (!event.canceled && source?.type === "task" && draggedTaskId && activeColumn) {
          const foundIndex = items[activeColumn]?.findIndex((t) => t.id === draggedTaskId) ?? -1;
          const newPosition = Math.max(0, foundIndex);

          if (activeColumn === sourceColumn) {
            if (initialPosition !== null && newPosition !== initialPosition) {
              reorderTaskMutation({
                id: draggedTaskId,
                position: newPosition,
              });
            }
          } else {
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
              tasks={items[String(column.id)] ?? []}
              index={columnIndex}
              isDropTarget={dropTargetColumn === String(column.id)}
            />
          );
        })}
      </div>
    </DragDropProvider>
  );
}
