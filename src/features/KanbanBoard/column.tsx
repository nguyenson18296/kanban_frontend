import { useSortable } from "@dnd-kit/react/sortable";
import { CollisionPriority } from '@dnd-kit/abstract';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { ITask } from "../../types";
import Task from "./task";
import { cn } from "@/lib/utils";

interface ColumnProps {
  id: number;
  title: string;
  color: string;
  tasks: ITask[];
  index: number;
  isDropTarget: boolean;
}

export default function Column({ id, title, color, tasks, index, isDropTarget }: Readonly<ColumnProps>) {
  const { ref } = useSortable({
    id: String(id),
    index,
    type: "column",
    accept: ["column", "task"],
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="flex min-w-[320px] flex-col">
      {/* Column header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-sm font-bold text-[#0f172a]">{title}</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[#f1f5f9] px-1.5 text-xs font-medium text-[#64748b]">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon-xs" className="text-[#94a3b8] hover:text-[#64748b]">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column body */}
      <div
        className={cn(
          "flex flex-1 flex-col rounded-2xl p-3 transition-all duration-200",
          !isDropTarget && "bg-[#f8fafc]",
          isDropTarget && "border-2 border-dashed border-[#6366f1] bg-[#eef2ff]",
        )}
        ref={ref}
      >
        {tasks.map((task, taskIndex) => (
          <Task key={task.id} index={taskIndex} columnId={id} {...task} />
        ))}
      </div>

      {/* Add Task footer */}
      <Button
        variant="ghost"
        className="mt-3 w-full justify-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#64748b]"
      >
        <Plus className="h-4 w-4" />
        Add Task
      </Button>
    </div>
  );
}
