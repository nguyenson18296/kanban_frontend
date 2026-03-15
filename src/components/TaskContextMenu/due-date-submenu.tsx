import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu";
import { Calendar, CalendarRange } from "lucide-react";

import { DUE_DATE_OPTIONS, type DueDateOption } from "@/utils/date";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { ITask } from "@/types";

interface DueDateSubmenuProps {
  task: ITask;
  onEditCustomDueDate: (task: ITask) => void;
  onTaskUpdate?: (partial: Partial<ITask>) => void;
}

export default function DueDateSubmenu({ task, onEditCustomDueDate, onTaskUpdate }: Readonly<DueDateSubmenuProps>) {
  const { mutate: updateTaskMutation } = useUpdateTask();
  const updateTaskDueDate = useStoreKanbanBoard((state) => state.updateTaskDueDate);

  const handleDueDateChange = (date: Date | null) => {
    const due_date = date ? date.toISOString() : null;
    if (due_date) {
      updateTaskDueDate(task.id, due_date);
      updateTaskMutation({ id: task.id, task: { due_date } });
      onTaskUpdate?.({ due_date });
    }
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Calendar className="size-4" />
        &nbsp;
        Due date
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem onSelect={() => onEditCustomDueDate(task)}>
          <CalendarRange className="size-4" />
          Custom...
        </ContextMenuItem>
        {DUE_DATE_OPTIONS.map((item: DueDateOption) => (
          <ContextMenuItem key={item.label} onSelect={() => handleDueDateChange(item.getDate())}>
            <item.icon className="size-4" />
            {item.label}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}