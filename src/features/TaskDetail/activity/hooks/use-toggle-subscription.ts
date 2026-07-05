import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  subscribeToTask,
  unsubscribeFromTask,
} from "@/services/subscription.service";
import { toastError } from "@/lib/toast-error";
import { useStoreUser } from "@/stores/use-store-user";
import type { ISubscriptionStatus, ISubscriberListResponse } from "@/types";
import {
  addSubscribersToCache,
  makeSubscriber,
  removeSubscriberFromCache,
  restoreSubscribers,
  snapshotSubscribers,
  subscribersKey,
} from "@/lib/subscriber-cache";

interface ToggleContext {
  previousStatus: ISubscriptionStatus | undefined;
  previousSubscribers: ISubscriberListResponse | undefined;
}

/**
 * Toggle the current user's subscription to a task.
 * `mutate(nextSubscribed)` — pass the desired state (e.g. `!currentlySubscribed`).
 *
 * Subscriptions have no Zustand store, so optimism lives in the Query cache:
 * we flip the status query AND add/remove the current user in the subscriber
 * list immediately, then revert both on error.
 */
export function useToggleSubscription(taskId: string) {
  const queryClient = useQueryClient();
  const user = useStoreUser((s) => s.user);
  const statusKey = ["subscription", taskId] as const;

  return useMutation<void, Error, boolean, ToggleContext>({
    mutationFn: async (nextSubscribed) => {
      if (nextSubscribed) {
        await subscribeToTask(taskId);
      } else {
        await unsubscribeFromTask(taskId);
      }
    },
    onMutate: async (nextSubscribed) => {
      await queryClient.cancelQueries({ queryKey: statusKey }); // 1. stop any in-flight GET /subscription/me
      await queryClient.cancelQueries({ queryKey: subscribersKey(taskId) }); // 1. ...and GET /subscribers

      // 2. snapshot the true pre-mutation cache (restored in onError)
      const previousStatus =
        queryClient.getQueryData<ISubscriptionStatus>(statusKey);
      const previousSubscribers = snapshotSubscribers(queryClient, taskId);

      // 3. write the optimistic value: flip the status + add/remove the current user
      const now = new Date().toISOString();
      queryClient.setQueryData<ISubscriptionStatus>(statusKey, {
        subscribed: nextSubscribed,
        source: nextSubscribed ? "manual" : null,
        since: nextSubscribed ? now : null,
      });

      if (user) {
        if (nextSubscribed) {
          addSubscribersToCache(queryClient, taskId, [
            makeSubscriber(user, "manual", now),
          ]);
        } else {
          removeSubscriberFromCache(queryClient, taskId, user.id);
        }
      }

      return { previousStatus, previousSubscribers };
    },
    onError: (error, _nextSubscribed, context) => {
      // Restore the exact pre-mutation snapshots — including `undefined`, so a
      // failed toggle can't leave the optimistic status stuck in the cache
      // (e.g. when the status query wasn't cached or had itself errored).
      if (context) {
        if (context.previousStatus === undefined) {
          queryClient.removeQueries({ queryKey: statusKey });
        } else {
          queryClient.setQueryData(statusKey, context.previousStatus);
        }
        restoreSubscribers(queryClient, taskId, context.previousSubscribers);
      }
      toastError(error, "Could not update your subscription. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusKey });
      queryClient.invalidateQueries({ queryKey: subscribersKey(taskId) });
    },
  });
}
