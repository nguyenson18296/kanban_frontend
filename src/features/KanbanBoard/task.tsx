import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  AvatarGroup,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import PriorityDropdown from "@/components/PriorityDropdown";
import type { ITask, Priority } from "../../types";
import { cn } from "@/lib/utils";

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
  id,
  title,
  labels,
  priority,
  assignees,
  columnId,
  index,
}: Readonly<TaskProps>) {
  const { ref, isDragging } = useSortable({
    id,
    type: "task",
    group: String(columnId),
    accept: ["task"],
    index,
  });

  const [localPriority, setLocalPriority] = useState<Priority>(priority);

  const handlePriorityChange = (value: Priority) => {
    setLocalPriority(value);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "mb-3 cursor-grab rounded-xl border border-[#e8ecf1] bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
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

      {/* Footer */}
      {assignees.length > 0 ? (
        <AvatarGroup className="pt-4 pb-2">
          {assignees.map((assignee) => (
            <Avatar key={assignee.id} id={assignee.id} className="size-5">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback>{assignee.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      ) : null}

    </div>
  );
}
