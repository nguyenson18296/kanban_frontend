import { useSortable } from "@dnd-kit/react/sortable";
import { Calendar, MessageSquare } from "lucide-react";
import type { ITask } from "../../types";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  Budget: 'bg-emerald-50 text-emerald-600',
  Research: 'bg-slate-100 text-slate-600',
  Development: 'bg-blue-50 text-blue-600',
  Design: 'bg-purple-50 text-purple-600',
  Bug: 'bg-red-50 text-red-600',
};

interface TaskProps extends ITask {
  index: number;
  columnId: string;
}

export default function Task({
  id,
  title,
  tag,
  assignee_avatar,
  due_date,
  comments_count,
  subtasks_done,
  subtasks_total,
  progress,
  columnId,
  index,
}: Readonly<TaskProps>) {
  const { ref, isDragging } = useSortable({
    id,
    type: "task",
    group: columnId,
    accept: ["task"],
    index,
  });

  const tagColor = TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600';

  return (
    <div
      ref={ref}
      className={cn(
        'mb-3 cursor-grab rounded-xl border border-[#e8ecf1] bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
      )}
    >
      {/* Tag */}
      <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-medium', tagColor)}>
        {tag}
      </span>

      {/* Title */}
      <h3 className="mt-3 text-sm font-semibold text-[#0f172a]">{title}</h3>

      {/* Progress bar */}
      {progress != null && subtasks_total != null && subtasks_total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        {/* Avatar */}
        <img
          src={assignee_avatar}
          alt=""
          className="h-7 w-7 rounded-full object-cover"
        />

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
          {comments_count != null && comments_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {comments_count}
            </span>
          )}
          {subtasks_done != null && subtasks_total != null && subtasks_total > 0 && (
            <span>{subtasks_done}/{subtasks_total}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {due_date}
          </span>
        </div>
      </div>
    </div>
  );
}