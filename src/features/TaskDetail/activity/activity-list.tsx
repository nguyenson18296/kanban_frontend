import { useEffect, useRef } from "react";
import { isToday, isYesterday, format } from "date-fns";
import { History, Loader2 } from "lucide-react";

import type { IActivity } from "@/types";
import ActivityItem from "./activity-item";

interface ActivityListProps {
  activities: IActivity[];
  hasNextPage: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function groupByDate(activities: IActivity[]): Map<string, IActivity[]> {
  const groups = new Map<string, IActivity[]>();
  for (const activity of activities) {
    const label = getDateLabel(activity.created_at);
    const group = groups.get(label);
    if (group) {
      group.push(activity);
    } else {
      groups.set(label, [activity]);
    }
  }
  return groups;
}

function LoadMoreSentinel({ onLoadMore, isLoadingMore }: Readonly<{ onLoadMore: () => void; isLoadingMore: boolean }>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, isLoadingMore]);

  return (
    <div ref={sentinelRef} className="flex items-center justify-center py-4">
      {isLoadingMore && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export default function ActivityList({ activities, hasNextPage, onLoadMore, isLoadingMore }: Readonly<ActivityListProps>) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-violet-50">
          <History className="size-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground m-0">No activity yet</p>
          <p className="text-xs text-muted-foreground m-0 mt-1">Actions on this task will appear here</p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(activities);

  return (
    <div className="py-2">
      {[...groups.entries()].map(([label, items]) => (
        <div key={label} className="mb-4 last:mb-0">
          {/* Section header with timeline spine */}
          <div className="relative flex items-center gap-3 pl-[5px] mb-1">
            <div className="w-5 h-px bg-[#e2e8f0]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-indigo-500">
              {label}
            </span>
          </div>

          <div className="activity-group">
            {items.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <LoadMoreSentinel onLoadMore={onLoadMore} isLoadingMore={isLoadingMore} />
      )}
    </div>
  );
}
