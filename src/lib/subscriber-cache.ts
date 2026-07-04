import type { QueryClient } from "@tanstack/react-query";

import type {
  ISubscriber,
  ISubscriberListResponse,
  SubscriptionSource,
} from "@/types";

export const subscribersKey = (taskId: string) =>
  ["subscribers", taskId] as const;

export function makeSubscriber(
  user: { id: string; full_name: string; avatar_url: string | null },
  source: SubscriptionSource,
  createdAt: string,
): ISubscriber {
  return {
    user_id: user.id,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    source,
    created_at: createdAt,
  };
}

/**
 * Optimistically add subscribers to the cached list, deduped by `user_id`.
 * No-op if the list isn't cached yet — this avoids seeding a *partial* list
 * from surfaces where it isn't shown (e.g. assigning from the board); the
 * mutation's `onSettled` invalidation will populate it correctly on next read.
 */
export function addSubscribersToCache(
  queryClient: QueryClient,
  taskId: string,
  additions: ISubscriber[],
): void {
  if (!additions.length) return;
  queryClient.setQueryData<ISubscriberListResponse>(
    subscribersKey(taskId),
    (prev) => {
      if (!prev) return prev;
      // Dedupe against existing subscribers AND within the additions batch
      // (e.g. an author who @mentions themselves yields two entries for one id).
      const seen = new Set(prev.items.map((s) => s.user_id));
      const toAdd: ISubscriber[] = [];
      for (const s of additions) {
        if (seen.has(s.user_id)) continue;
        seen.add(s.user_id);
        toAdd.push(s);
      }
      return toAdd.length ? { items: [...prev.items, ...toAdd] } : prev;
    },
  );
}

/** Optimistically remove a subscriber by `user_id` (no-op if list uncached). */
export function removeSubscriberFromCache(
  queryClient: QueryClient,
  taskId: string,
  userId: string,
): void {
  queryClient.setQueryData<ISubscriberListResponse>(
    subscribersKey(taskId),
    (prev) =>
      prev ? { items: prev.items.filter((s) => s.user_id !== userId) } : prev,
  );
}

export function snapshotSubscribers(
  queryClient: QueryClient,
  taskId: string,
): ISubscriberListResponse | undefined {
  return queryClient.getQueryData<ISubscriberListResponse>(
    subscribersKey(taskId),
  );
}

export function restoreSubscribers(
  queryClient: QueryClient,
  taskId: string,
  snapshot: ISubscriberListResponse | undefined,
): void {
  // `setQueryData(key, undefined)` is ignored by React Query, so to truly roll
  // back to a pre-mutation "uncached" state we must remove the entry.
  if (snapshot === undefined) {
    queryClient.removeQueries({ queryKey: subscribersKey(taskId) });
  } else {
    queryClient.setQueryData(subscribersKey(taskId), snapshot);
  }
}
