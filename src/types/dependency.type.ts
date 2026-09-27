type DependencyTaskStatus = "open" | "in_progress" | "in_review" | "done" | "cancelled";

/** Compact summary, not a full task; `column_id` may belong to another board. */
interface IDependencyTask {
  id: string;
  ticket_id: string | null;
  title: string;
  status: DependencyTaskStatus;
  column_id: number;
}

/** Both directions of a task's dependency edges; arrays are always present. */
interface ITaskDependencies {
  blocked_by: IDependencyTask[];
  blocks: IDependencyTask[];
}

/** Which side of the edge the current task is on (routing: see dependency-edge.ts). */
type DependencyDirection = "blocked_by" | "blocks";

export type {
  DependencyDirection,
  DependencyTaskStatus,
  IDependencyTask,
  ITaskDependencies,
};
