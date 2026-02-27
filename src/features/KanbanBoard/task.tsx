import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";

import AssigneeDropdown from "@/components/AssigneeDropdown";
import PriorityDropdown from "@/components/PriorityDropdown";
import TaskContextMenu from "@/components/TaskContextMenu";
import type { ITask, Priority, TAssignee } from "../../types";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "./hooks/use-update-task";
import { useUpdateAssignees } from "@/components/AssigneeDropdown/hooks/use-update-assignees";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

const TAG_COLORS: Record<string, string> = {
  Budget: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Research: "bg-white text-[#64748b] border-[#e2e8f0]",
  Development: "bg-blue-50 text-blue-600 border-blue-200",
  Design: "bg-blue-50 text-blue-600 border-blue-200",
  Bug: "bg-red-50 text-red-600 border-red-200",
  Strategy: "bg-orange-50 text-orange-600 border-orange-200",
  System: "bg-teal-50 text-teal-600 border-teal-200",
  Marketing: "bg-pink-50 text-pink-600 border-pink-200",
  Feature: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Copy: "bg-red-50 text-red-600 border-red-200",
  Legal: "bg-slate-50 text-slate-600 border-slate-200",
  Admin: "bg-white text-[#64748b] border-[#e2e8f0]",
};

interface TaskProps extends ITask {
  index: number;
  columnId: number;
}

export default function Task({
  index,
  columnId,
  ...task
}: Readonly<TaskProps>) {
  const { id, title, labels, priority, assignees } = task;
  const { ref, isDragging } = useSortable({
    id,
    type: "task",
    group: String(columnId),
    index,
  });

  const [localPriority, setLocalPriority] = useState<Priority>(priority);
  const { mutate: updateTaskMutation } = useUpdateTask();
  const { mutate: updateAssigneesMutation } = useUpdateAssignees();
  const updateTaskAssignees = useStoreKanbanBoard((state) => state.updateTaskAssignees);

  const handlePriorityChange = (value: Priority) => {
    updateTaskMutation({ id, task: { priority: value } });
    setLocalPriority(value);
  };

  const handleAssigneeChange = (newAssignees: TAssignee[]) => {
    updateAssigneesMutation({
      id,
      assignee_ids: newAssignees.map((a) => a.id),
      previousAssignees: assignees,
    });
    updateTaskAssignees(id, newAssignees);
  };

  return (
    <TaskContextMenu
      task={{ ...task, priority: localPriority, column_id: columnId }}
      onChangePriority={(_task, newPriority) => handlePriorityChange(newPriority)}
    >
      <div
        ref={ref}
        className={cn(
          "mb-3 cursor-grab rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
          isDragging
            ? "rotate-3 scale-105 border-[#6366f1] shadow-lg ring-2 ring-[#6366f1]/20"
            : "border-[#e8ecf1]",
        )}
      >
        {/* Tag */}
        {labels.length > 0 ? (
          <div className="flex items-center gap-1">
            {labels.map((label) => (
              <span
                key={label.id}
                className={cn(
                  "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  TAG_COLORS[label.name] ?? "bg-white text-[#64748b] border-[#e2e8f0]",
                )}
              >
                {label.name}
              </span>
            ))}
          </div>
        ) : null}

        {/* Title */}
        <h3 className="mt-2.5 text-sm font-semibold text-[#0f172a]">{title}</h3>

        {/* Priority */}
        <PriorityDropdown priority={localPriority} onPriorityChange={handlePriorityChange} />
        <AssigneeDropdown
          assignees={assignees}
          onAssigneeChange={handleAssigneeChange}
        />
      </div>
    </TaskContextMenu>
  );
}
