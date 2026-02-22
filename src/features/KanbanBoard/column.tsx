import { useSortable } from "@dnd-kit/react/sortable";
import { CollisionPriority } from '@dnd-kit/abstract';

import type { ITask } from "../../types";
import Task from "./task";
import { cn } from "@/lib/utils";

interface ColumnProps {
  id: string;
  title: string;
  tasks: ITask[];
  index: number;
  isDropTarget: boolean;
}

export default function Column({ id, title, tasks, index, isDropTarget }: Readonly<ColumnProps>) {
  const { ref } = useSortable({
    id,
    index,
    type: "column",
    accept: ["column", "task"],
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="min-w-[320px]">
      <h2>{title}</h2>
      <div
        className={cn(
          "flex min-h-screen min-w-64 w-full flex-col border border-gray-200 rounded-md p-4 m-4 transition-all duration-300",
          !isDropTarget && "bg-[#f0f0f0]",
          isDropTarget && "bg-[#66b9e9]"
        )}
        ref={ref}
      >
        {tasks.map((task, index) => (
          <Task key={task.id} index={index} columnId={id} {...task} />
        ))}
      </div>
    </div>
  );
}
