import { useParams } from "@tanstack/react-router";

import { useGetTaskByTicketId } from "./hooks/use-get-task-by-ticket-id";
import { useGetBoard } from "@/features/KanbanBoard/hooks/use-get-board";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useUpdateAssignees } from "@/components/AssigneeDropdown/hooks/use-update-assignees";
import { useUpdateTaskLabels } from "./hooks/use-update-task-labels";

import TaskDetailHeader from "./task-detail-header";
import TaskDetailDescription from "./task-detail-description";
import TaskDetailSidebar from "./task-detail-sidebar";
import type { ILabel, Priority, TAssignee } from "@/types";

export default function TaskDetail() {
  const { taskId: ticketId, projectId } = useParams({
    from: "/_authenticated/projects/$projectId/tasks/$taskId",
  });

  useGetBoard(projectId);
  const { data: task, isLoading, isError } = useGetTaskByTicketId(ticketId);

  const { mutate: updateTaskMutation } = useUpdateTask();
  const { mutate: updateAssigneesMutation } = useUpdateAssignees();
  const { mutate: updateTaskLabelsMutation } = useUpdateTaskLabels();

  const handlePriorityChange = (priority: Priority) => {
    if (!task) return;
    if (task.priority === priority) return;
    updateTaskMutation({
      id: task.id,
      task: { priority },
    });
  };

  const handleAssigneeChange = (assignees: TAssignee[]) => {
    if (!task) return;
    const prevIds = new Set(task.assignees.map((a) => a.id));
    const nextIds = new Set(assignees.map((a) => a.id));
    if (prevIds.size === nextIds.size && [...prevIds].every((id) => nextIds.has(id))) return;
    updateAssigneesMutation({
      id: task.id,
      assignee_ids: assignees.map((a) => a.id),
      previousAssignees: task.assignees,
    });
  };

  const handleLabelsChange = (labels: ILabel[]) => {
    if (!task) return;
    updateTaskLabelsMutation({
      id: task.id,
      label_ids: labels.map((l) => l.id),
    });
  };

  const handleDueDateChange = (date: string | null) => {
    if (!task) return;
    updateTaskMutation({
      id: task.id,
      task: { due_date: date },
    });
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading task...</div>;
  }

  if (isError || !task) {
    return <div className="p-8 text-sm text-muted-foreground">Task not found</div>;
  }

  return (
    <div className="flex gap-4">
      <div className="w-3/4">
      <TaskDetailHeader
        title={task.title}
        ticket_id={task.ticket_id}
        created_at={task.created_at}
        creator={task.creator}
      />
      <TaskDetailDescription key={task.id} id={task.id} description={task.description} />
      </div>
      <div className="w-1/4">
        <TaskDetailSidebar
          assignees={task.assignees}
          onAssigneeChange={handleAssigneeChange}
          priority={task.priority}
          onPriorityChange={handlePriorityChange}
          key={task.id}
          id={task.id}
          column_id={task.column_id}
          labels={task.labels}
          due_date={task.due_date}
          onDueDateChange={handleDueDateChange}
          onLabelsChange={handleLabelsChange}
        />
      </div>
    </div>
  );
}
