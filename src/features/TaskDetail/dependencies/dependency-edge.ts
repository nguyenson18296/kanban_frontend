import type { DependencyDirection } from "@/types";

/** One edge, seen from the task being viewed. */
interface DependencyEdgeInput {
  direction: DependencyDirection;
  currentTaskId: string;
  otherTaskId: string;
}

/**
 * Every dependency route is addressed by the BLOCKED task; the body carries
 * the blocker — which is also the other cache key to invalidate.
 */
function dependencyEdge({ direction, currentTaskId, otherTaskId }: DependencyEdgeInput): {
  routeTaskId: string;
  blockerId: string;
} {
  return direction === "blocked_by"
    ? { routeTaskId: currentTaskId, blockerId: otherTaskId }
    : { routeTaskId: otherTaskId, blockerId: currentTaskId };
}

export { dependencyEdge };
export type { DependencyEdgeInput };
