import { useParams } from "@tanstack/react-router";

import { useGetTaskByTicketId } from "./hooks/use-get-task-by-ticket-id";

import TaskDetailHeader from "./task-detail-header";
import TaskDetailDescription from "./task-detail-description";

export default function TaskDetail() {
  const { taskId: ticketId } = useParams({
    from: "/_authenticated/projects/$projectId/tasks/$taskId",
  });

  const { data: task, isLoading, isError } = useGetTaskByTicketId(ticketId);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading task...</div>;
  }

  if (isError || !task) {
    return <div className="p-8 text-sm text-muted-foreground">Task not found</div>;
  }
  return (
    <div>
      <TaskDetailHeader
        title={task.title}
        ticket_id={task.ticket_id}
        created_at={task.created_at}
        creator={task.creator}
      />
      <TaskDetailDescription key={task.id} id={task.id} description={task.description} />
    </div>
  );
}
