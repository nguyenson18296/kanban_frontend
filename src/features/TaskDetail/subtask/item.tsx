import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";

import TaskContextMenu from "@/components/TaskContextMenu";
import AvatarGroupCustom from "@/components/AvatarGroup";
import DueDateDropdown from "@/components/DueDateDropdown";
import TaskLabelDropdown from "@/components/TaskLabelDropdown";
import StackedLabels from "@/components/TaskLabel/stacked-labels";

import type { ITask } from "@/types/task.type";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useUpdateTaskLabels } from "../hooks/use-update-task-labels";
import type { ILabel } from "@/types";

interface SubtaskItemProps {
  task: ITask;
}

export default function SubtaskItem({ task }: Readonly<SubtaskItemProps>) {
  const [columnId, setColumnId] = useState(task.column_id);
  const [assignees, setAssignees] = useState(task.assignees);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [labels, setLabels] = useState(task.labels);
  const [priority, setPriority] = useState(task.priority);

  const { mutate: updateTaskMutation } = useUpdateTask();
  const { mutate: updateTaskLabelsMutation } = useUpdateTaskLabels();

  const statusColor = useStoreKanbanBoard(
    (state) => state.kanbanBoard?.columns.find((col) => col.id === columnId)?.color,
  );

  const handleDueDateChange = (date: string | null) => {
    if (dueDate === date) return;
    setDueDate(date);
    updateTaskMutation({ id: task.id, task: { due_date: date } });
  };

  const handleLabelsChange = (newLabels: ILabel[]) => {
    const prevIds = labels.map((l) => l.id).sort().join(",");
    const nextIds = newLabels.map((l) => l.id).sort().join(",");
    if (prevIds === nextIds) return;
    setLabels(newLabels);
    updateTaskLabelsMutation({ id: task.id, label_ids: newLabels.map((l) => l.id) });
  };

  const handleTaskUpdate = (partial: Partial<ITask>) => {
    if (partial.column_id !== undefined) setColumnId(partial.column_id);
    if (partial.assignees !== undefined) setAssignees(partial.assignees);
    if (partial.due_date !== undefined) setDueDate(partial.due_date);
    if (partial.labels !== undefined) setLabels(partial.labels);
    if (partial.priority !== undefined) setPriority(partial.priority);
  };

  return (
    <TaskContextMenu
      task={{ ...task, column_id: columnId, assignees, due_date: dueDate, labels, priority }}
      onTaskUpdate={handleTaskUpdate}
    >
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2">
        <Checkbox />
        <span
          className="size-3 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="truncate text-sm font-medium text-[#1b1b1b]">
          {task.title}
        </span>
        <div className="flex items-center gap-2">
          <TaskLabelDropdown
            selectedLabels={labels}
            onLabelsChange={handleLabelsChange}
            trigger={
              labels.length > 0 ? (
                <StackedLabels labels={labels} />
              ) : undefined
            }
          />
          <DueDateDropdown dueDate={dueDate} taskId={task.id} onDueDateChange={handleDueDateChange} />
          <AvatarGroupCustom avatars={assignees} />
        </div>
      </div>
    </TaskContextMenu>
  )
}
