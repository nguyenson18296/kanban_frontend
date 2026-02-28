import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu";
import { ChartPie } from "lucide-react";

import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useMoveTaskToColumn } from "@/features/KanbanBoard/hooks/use-move-task-to-column";
import type { ITask } from "@/types";

interface StatusSubmenuProps {
  task: ITask;
}

export default function StatusSubmenu({ task }: Readonly<StatusSubmenuProps>) {
  const board = useStoreKanbanBoard((state) => state.kanbanBoard);
  const moveTaskInStore = useStoreKanbanBoard((state) => state.moveTask);
  const { mutate: moveTaskToColumnMutation } = useMoveTaskToColumn();

  const moveTask = (columnId: number) => {
    moveTaskInStore(task.id, task.column_id, columnId, 0);
    moveTaskToColumnMutation({ id: task.id, columnId, position: 0 });
  };

  const columns = board?.columns ?? [];
  const filteredColumns = columns.filter((column) => column.id !== task.column_id);

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