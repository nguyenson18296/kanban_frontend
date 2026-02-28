import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu";
import { Signal, Check } from "lucide-react";

import { PRIORITY_OPTIONS } from "@/constants/priority";
import type { ITask, Priority } from "@/types";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

interface PrioritySubmenuProps {
  task: ITask;
}

export default function PrioritySubmenu({ task }: Readonly<PrioritySubmenuProps>) {
  const { mutate: updateTaskMutation } = useUpdateTask();
  const updateTaskPriority = useStoreKanbanBoard((state) => state.updateTaskPriority);

  const handlePriorityChange = (value: Priority) => {
    if (task.priority === value) return;
    updateTaskPriority(task.id, value);
    updateTaskMutation({ id: task.id, task: { priority: value } });
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Signal className="size-4" />
        &nbsp;
        Priority
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {PRIORITY_OPTIONS.map((option) => (
          <ContextMenuItem key={option.value} onSelect={() => handlePriorityChange(option.value)}>
            <option.icon className={cn("size-4", option.color)} />
            {option.label}
            {task.priority === option.value && <Check className="ml-auto size-4 shrink-0" />}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}