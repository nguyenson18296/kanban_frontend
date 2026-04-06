import { useParams } from "@tanstack/react-router";

import { useGetTaskByTicketId } from "./hooks/use-get-task-by-ticket-id";
import { useGetBoard } from "@/features/KanbanBoard/hooks/use-get-board";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useUpdateAssignees } from "@/components/AssigneeDropdown/hooks/use-update-assignees";
import { useUpdateTaskLabels } from "./hooks/use-update-task-labels";

import TaskDetailHeader from "./task-detail-header";
import TaskDetailDescription from "./task-detail-description";
import TaskDetailSidebar from "./task-detail-sidebar";
import Subtask from "./subtask";
import Activity from "./activity";

import { TaskActivityAction } from "@/types";
import type { ILabel, Priority, TAssignee } from "@/types";
import {
  useStoreOptimisticActivities,
  createOptimisticActivity,
} from "@/stores/use-store-optimistic-activities";

export default function TaskDetail() {
  const { taskId: ticketId, projectId } = useParams({
    from: "/_authenticated/projects/$projectId/tasks/$taskId",
  });

  useGetBoard(projectId);
  const { data: task, isLoading, isError } = useGetTaskByTicketId(ticketId);
  const addOptimisticActivity = useStoreOptimisticActivities((s) => s.addActivity);

  const { mutate: updateTaskMutation } = useUpdateTask();
  const { mutate: updateAssigneesMutation } = useUpdateAssignees();
  const { mutate: updateTaskLabelsMutation } = useUpdateTaskLabels();

  const handlePriorityChange = (priority: Priority) => {
    if (!task) return;
    if (task.priority === priority) return;
    addOptimisticActivity(
      task.id,
      createOptimisticActivity(TaskActivityAction.TASK_PRIORITY_CHANGED, { from: task.priority, to: priority }),
    );
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

    const added = assignees.filter((a) => !prevIds.has(a.id));
    const removed = task.assignees.filter((a) => !nextIds.has(a.id));

    if (added.length > 0) {
      addOptimisticActivity(
        task.id,
        createOptimisticActivity(TaskActivityAction.TASK_ASSIGNEE_ADDED, { users: added.map((a) => ({ user_id: a.id, full_name: a.full_name })) }),
      );
    }
    if (removed.length > 0) {
      addOptimisticActivity(
        task.id,
        createOptimisticActivity(TaskActivityAction.TASK_ASSIGNEE_REMOVED, { users: removed.map((a) => ({ user_id: a.id, full_name: a.full_name })) }),
      );
    }

    updateAssigneesMutation({
      id: task.id,
      assignee_ids: assignees.map((a) => a.id),
      previousAssignees: task.assignees,
    });
  };

  const handleLabelsChange = (labels: ILabel[]) => {
    if (!task) return;
    const prevIds = new Set(task.labels.map((l) => l.id));
    const nextIds = new Set(labels.map((l) => l.id));

    const added = labels.filter((l) => !prevIds.has(l.id));
    const removed = task.labels.filter((l) => !nextIds.has(l.id));

    if (added.length > 0) {
      addOptimisticActivity(
        task.id,
        createOptimisticActivity(TaskActivityAction.TASK_LABEL_ADDED, { labels: added.map((l) => ({ label_id: Number(l.id), label_name: l.name, color: l.color })) }),
      );
    }
    if (removed.length > 0) {
      addOptimisticActivity(
        task.id,
        createOptimisticActivity(TaskActivityAction.TASK_LABEL_REMOVED, { labels: removed.map((l) => ({ label_id: Number(l.id), label_name: l.name, color: l.color })) }),
      );
    }

    updateTaskLabelsMutation({
      id: task.id,
      label_ids: labels.map((l) => l.id),
    });
  };

  const handleDueDateChange = (date: string | null) => {
    if (!task) return;
    addOptimisticActivity(
      task.id,
      createOptimisticActivity(TaskActivityAction.TASK_DUE_DATE_CHANGED, { from: task.due_date ?? null, to: date }),
    );
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
          projectId={projectId}
          parent={task.parent}
        />
        <TaskDetailDescription key={task.id} id={task.id} description={task.description} />
        <Subtask taskId={task.id} teamId={task.creator?.team_id ?? 0} />
        <Activity taskId={task.id} />
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
