import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu";
import { ChartPie } from "lucide-react";

import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useMoveTaskToColumn } from "@/features/KanbanBoard/hooks/use-move-task-to-column";
import type { ITask } from "@/types";

interface StatusSubmenuProps {
  id: string;
  column_id: number;
  onTaskUpdate?: (partial: Partial<ITask>) => void;
}

export default function StatusSubmenu({ id, column_id, onTaskUpdate }: Readonly<StatusSubmenuProps>) {
  const board = useStoreKanbanBoard((state) => state.kanbanBoard);
  const moveTaskInStore = useStoreKanbanBoard((state) => state.moveTask);
  const { mutate: moveTaskToColumnMutation } = useMoveTaskToColumn();

  const moveTask = (columnId: number) => {
    moveTaskInStore(id, column_id, columnId, 0);
    moveTaskToColumnMutation({ id, columnId, position: 0 });
    onTaskUpdate?.({ column_id: columnId });
  };

  const columns = board?.columns ?? [];
  const filteredColumns = columns.filter((column) => column.id !== column_id);

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <ChartPie className="size-4" />
        &nbsp;
        Status
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {filteredColumns.map((column) => (
          <ContextMenuItem key={column.id} onSelect={() => moveTask(column.id)}>
            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
            <span className="truncate">{column.name}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}