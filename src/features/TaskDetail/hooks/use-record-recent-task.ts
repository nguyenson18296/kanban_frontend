import { useEffect } from "react";

import { useStoreRecentTasks } from "@/stores/use-store-recent-tasks";

/**
 * Records the opened task in board search's "Recently opened" list (JAV-35).
 * Runs once the task has loaded, so deep links and board clicks both count
 * and failed lookups never pollute the list.
 */
export function useRecordRecentTask(projectId: string, ticketId: string | undefined) {
  useEffect(() => {
    if (!projectId || !ticketId) return;
    useStoreRecentTasks.getState().recordRecentTask(projectId, ticketId);
  }, [projectId, ticketId]);
}
