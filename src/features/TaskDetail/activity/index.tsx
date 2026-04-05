import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import CommentsSection from "./comments";
import ActivityList from "./activity-list";
import { useGetActivities } from "./hooks/use-get-activities";
import type { IActivity } from "@/types";
import { useStoreOptimisticActivities } from "@/stores/use-store-optimistic-activities";

function getInitialTab() {
  return globalThis.location.hash.startsWith("#comment-") ? "comments" : "activity";
}

const EMPTY_ACTIVITIES: IActivity[] = [];

function ActivityLog({ taskId }: Readonly<{ taskId: string }>) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetActivities(taskId);
  const optimisticActivities = useStoreOptimisticActivities((s) => s.activities.get(taskId) ?? EMPTY_ACTIVITIES);

  const serverActivities = data?.pages.flatMap((page) => page.data) ?? [];

  // Filter out optimistic entries that already have a matching server entry.
  // Uses action type + 30s time window for matching — acceptable V1 trade-off.
  // Edge case: two rapid same-type changes within 30s may cause early dedup,
  // but self-corrects on next refetch since optimistic entries are transient.
  const pendingOptimistic = optimisticActivities.filter((opt) => {
    const optTime = new Date(opt.created_at).getTime();
    return !serverActivities.some(
      (srv) => srv.action === opt.action && Math.abs(new Date(srv.created_at).getTime() - optTime) < 30_000,
    );
  });

  // Clean up store on unmount — pendingOptimistic already filters matched entries
  // from the UI, so the store cleanup is only to free memory.
  useEffect(() => {
    return () => useStoreOptimisticActivities.getState().clearForTask(taskId);
  }, [taskId]);

  // Server returns oldest-first (ASC) — append optimistic at the end (newest)
  const activities = [...serverActivities, ...pendingOptimistic];

  return (
    <ActivityList
      activities={activities}
      hasNextPage={hasNextPage}
      onLoadMore={fetchNextPage}
      isLoadingMore={isFetchingNextPage}
    />
  );
}

export default function Activity({ taskId }: Readonly<{ taskId: string }>) {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = globalThis.location.hash;
    if (!hash.startsWith("#comment-")) return;

    const scrollToComment = () => {
      const el = document.querySelector<HTMLElement>(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("bg-white");
        el.classList.add("bg-indigo-100", "transition-colors", "duration-300");
        setTimeout(() => {
          el.classList.remove("bg-indigo-100");
          el.classList.add("bg-white");
        }, 1500);
        return true;
      }
      return false;
    };

    // Element may already exist
    if (scrollToComment()) return;

    // Otherwise wait for it to appear (comments still loading)
    const observer = new MutationObserver(() => {
      if (scrollToComment()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop watching after 5s if element never appears (stale/deleted comment)
    const timeout = setTimeout(() => observer.disconnect(), 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Tabs className="w-full mt-12" value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        <ActivityLog taskId={taskId} />
      </TabsContent>
      <TabsContent value="comments">
        <CommentsSection taskId={taskId} />
      </TabsContent>
    </Tabs>
  )
}