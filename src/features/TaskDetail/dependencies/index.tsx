import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreUser } from "@/stores/use-store-user";
import {
  useStoreOptimisticActivities,
  createOptimisticActivity,
} from "@/stores/use-store-optimistic-activities";
import { useGetProjectMembers } from "@/features/Settings/hooks/use-get-project-members";
import { normalizeProjectRole } from "@/features/Settings/member-roles";
import { TaskActivityAction } from "@/types";
import type { DependencyDirection, IDependencyTask } from "@/types";

import DependencyPicker from "./dependency-picker";
import { useTaskDependencies } from "./hooks/use-task-dependencies";
import { useRemoveDependency } from "./hooks/use-remove-dependency";

const GROUPS: { direction: DependencyDirection; label: string }[] = [
  { direction: "blocked_by", label: "Blocked by" },
  { direction: "blocks", label: "Blocks" },
];

function isClosed(entry: IDependencyTask): boolean {
  return entry.status === "done" || entry.status === "cancelled";
}

interface TaskDependenciesProps {
  taskId: string;
  projectId: string;
}

export default function TaskDependencies({ taskId, projectId }: Readonly<TaskDependenciesProps>) {
  const navigate = useNavigate();
  const { data: dependencies } = useTaskDependencies(taskId);
  const removeDependency = useRemoveDependency();
  const addOptimisticActivity = useStoreOptimisticActivities((s) => s.addActivity);

  // UX gating only — the server re-checks the role (403) on every write.
  const currentUserId = useStoreUser((s) => s.user?.id);
  const { data: members } = useGetProjectMembers(projectId);
  const membership = members?.find((member) => member.user.id === currentUserId);
  const canEdit = membership ? normalizeProjectRole(membership.role) !== "viewer" : false;

  const board = useStoreKanbanBoard((s) => s.kanbanBoard);
  const columnColor = (columnId: number) =>
    board?.columns.find((column) => column.id === columnId)?.color;

  const openEntry = (entry: IDependencyTask) => {
    if (!entry.ticket_id) return;
    void navigate({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId, taskId: entry.ticket_id },
    });
  };

  const removeEntry = (direction: DependencyDirection, entry: IDependencyTask) => {
    removeDependency.mutate(
      { direction, currentTaskId: taskId, otherTaskId: entry.id },
      {
        onSuccess: () => {
          // Activity lands on the blocked task — a "blocks" removal logs on the other feed.
          if (direction === "blocked_by") {
            addOptimisticActivity(
              taskId,
              createOptimisticActivity(TaskActivityAction.TASK_DEPENDENCY_REMOVED, {
                dependencies: [
                  { task_id: entry.id, ticket_id: entry.ticket_id, title: entry.title },
                ],
              }),
            );
          }
        },
      },
    );
  };

  const isRemoving = (entry: IDependencyTask) =>
    removeDependency.isPending && removeDependency.variables?.otherTaskId === entry.id;

  const groups = dependencies
    ? GROUPS.map((group) => ({ ...group, entries: dependencies[group.direction] })).filter(
        (group) => group.entries.length > 0,
      )
    : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Dependencies</Label>
        {/* Not before the lists load — the picker must know what's already linked. */}
        {canEdit && dependencies && (
          <DependencyPicker taskId={taskId} dependencies={dependencies} />
        )}
      </div>

      {dependencies && groups.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No dependencies</p>
      )}

      <div className="mt-2 flex flex-col gap-2.5">
        {groups.map((group) => (
          <div key={group.direction} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-muted-foreground">
              <span>{group.label}</span>
              <span className="text-[11px] font-bold text-muted-foreground/70">
                {group.entries.length}
              </span>
            </div>
            {group.entries.map((entry) => {
              const closed = isClosed(entry);
              const color = columnColor(entry.column_id);
              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn("size-2 shrink-0 rounded-full", !color && "bg-muted-foreground/30")}
                    style={color ? { backgroundColor: color } : undefined}
                  />
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                    {entry.ticket_id}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-medium",
                      closed && "line-through text-muted-foreground",
                    )}
                  >
                    {entry.title}
                  </span>
                </>
              );
              return (
                <div
                  key={entry.id}
                  className="group flex items-center gap-0.5 rounded-md pr-0.5 hover:bg-accent"
                >
                  {entry.ticket_id ? (
                    <button
                      type="button"
                      onClick={() => openEntry(entry)}
                      title={`${entry.ticket_id} · ${entry.title}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {content}
                    </button>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5">
                      {content}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeEntry(group.direction, entry)}
                      disabled={isRemoving(entry)}
                      aria-busy={isRemoving(entry)}
                      aria-label={`Remove link to ${entry.ticket_id ?? entry.title}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
