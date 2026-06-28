import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { scheduleRefetchVisiblePresence } from "@/lib/presence/bootstrap";
import {
  useStorePresence,
  type PresenceEntry,
} from "@/stores/use-store-presence";

/**
 * Subscribe to a single user's presence. Registers the userId as visible
 * (so it stays fresh on reconnect refetches) and triggers a debounced
 * REST snapshot. The debounce coalesces bursts of mounts (e.g. an
 * AvatarGroup rendering 50 avatars) into a single chunked REST call.
 *
 * Pass `enabled=false` when the caller already knows the answer (e.g.
 * `<UserAvatar isOnline={true} />`) and doesn't need a store subscription.
 */
export function useUserPresence(
  userId: string,
  enabled = true,
): PresenceEntry | undefined {
  useEffect(() => {
    if (!enabled) return;
    useStorePresence.getState().registerUsers([userId]);
    scheduleRefetchVisiblePresence();
    return () => {
      useStorePresence.getState().unregisterUsers([userId]);
    };
  }, [userId, enabled]);

  // Returns undefined when the store has no data for this user — callers
  // should treat that as "unknown", not "offline" (contract §9).
  return useStorePresence((s) =>
    enabled ? s.byUserId[userId] : undefined,
  );
}

/**
 * Subscribe to a set of users' presence. Returns a map keyed by userId.
 * Re-runs the registration effect only when the set of ids changes
 * (sorted), not when the array reference changes.
 *
 * Missing entries map to `undefined` ("unknown"), NOT a fabricated
 * offline state — callers can distinguish "we haven't heard yet" from
 * "definitively offline" per contract §9.
 */
export function usePresenceMap(
  userIds: string[],
): Record<string, PresenceEntry | undefined> {
  const sortedIds = [...new Set(userIds)].sort((a, b) => a.localeCompare(b));
  const key = sortedIds.join(",");

  useEffect(() => {
    if (sortedIds.length === 0) return;
    useStorePresence.getState().registerUsers(sortedIds);
    scheduleRefetchVisiblePresence();
    return () => {
      useStorePresence.getState().unregisterUsers(sortedIds);
    };
    // sortedIds is recomputed every render but its content is stable
    // when `key` is — that's the dependency we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useStorePresence(
    useShallow((s) => {
      const out: Record<string, PresenceEntry | undefined> = {};
      for (const id of sortedIds) {
        out[id] = s.byUserId[id];
      }
      return out;
    }),
  );
}
