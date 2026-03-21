import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

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
  const [overrides, setOverrides] = useState<Partial<ITask>>({});
  const merged = { ...task, ...overrides };

  const { projectId } = useParams({ from: "/_authenticated/projects/$projectId/tasks/$taskId" });

  const { mutate: updateTaskMutation } = useUpdateTask();
  const { mutate: updateTaskLabelsMutation } = useUpdateTaskLabels();

  const statusColor = useStoreKanbanBoard(
    (state) => state.kanbanBoard?.columns.find((col) => col.id === merged.column_id)?.color,
  );

  const handleDueDateChange = (date: string | null) => {
    if (merged.due_date === date) return;
    setOverrides((prev) => ({ ...prev, due_date: date }));
    updateTaskMutation({ id: task.id, task: { due_date: date } });
  };

  const handleLabelsChange = (newLabels: ILabel[]) => {
    const prevIds = merged.labels.map((l) => l.id).sort().join(",");
    const nextIds = newLabels.map((l) => l.id).sort().join(",");
    if (prevIds === nextIds) return;
    setOverrides((prev) => ({ ...prev, labels: newLabels }));
    updateTaskLabelsMutation({ id: task.id, label_ids: newLabels.map((l) => l.id) });
  };

  const handleTaskUpdate = (partial: Partial<ITask>) => {
    setOverrides((prev) => ({ ...prev, ...partial }));
  };

  return (
    <TaskContextMenu
      task={merged}
      onTaskUpdate={handleTaskUpdate}
    >
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 hover:bg-[#e5ebf7] data-[state=open]:bg-[#e5ebf7] p-2 rounded-md">
        <Checkbox />
        <span
          className="size-3 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <Link
          to="/projects/$projectId/tasks/$taskId"
          params={{ projectId, taskId: task.ticket_id }}
          className="truncate text-sm font-medium text-[#1b1b1b] hover:underline"
        >
          {task.title}
        </Link>
        <div className="flex items-center gap-2">
          <TaskLabelDropdown
            selectedLabels={merged.labels}
            onLabelsChange={handleLabelsChange}
            trigger={
              merged.labels.length > 0 ? (
                <StackedLabels labels={merged.labels} />
              ) : undefined
            }
          />
          <DueDateDropdown dueDate={merged.due_date} taskId={task.id} onDueDateChange={handleDueDateChange} />
          <AvatarGroupCustom avatars={merged.assignees} />
        </div>
      </div>
    </TaskContextMenu>
  )
}
