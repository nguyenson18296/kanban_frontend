import type { ITask } from "@/types";
import { Link } from "@tanstack/react-router";

import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

type TaskDetailHeaderProps = Pick<ITask, 'parent' | 'title'> & {
  projectId: string;
};

export default function TaskDetailHeader({ parent, title, projectId }: Readonly<TaskDetailHeaderProps>) {
  const column_id = parent?.column_id;
  const statusColor = useStoreKanbanBoard(
    (state) => state.kanbanBoard?.columns.find((col) => col.id === column_id)?.color,
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">
        {title}
      </h1>
      {parent && (
        <div className="flex items-center gap-2 mt-2">
          Sub issue of
          <Link
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId, taskId: parent.ticket_id }}
            className="text-sm text-muted-foreground flex items-center gap-2"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            {parent.title}
          </Link>
        </div>
      )}
    </div>
  );
}
