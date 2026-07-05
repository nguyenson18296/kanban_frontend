import {
  PRESENCE_BULK_LIMIT,
  getPresence,
} from "@/services/presence.service";
import { useStorePresence } from "@/stores/use-store-presence";
import type { IPresenceUpdate } from "@/types";
import { chunk } from "@/utils/array";

const RECONNECT_REFETCH_DEBOUNCE_MS = 250;

let refetchTimer: ReturnType<typeof setTimeout> | null = null;

export async function refetchVisiblePresence(): Promise<void> {
  const ids = useStorePresence.getState().getVisibleUserIds();
  if (ids.length === 0) return;

  const dedup = Array.from(new Set(ids));
  const chunks = chunk(dedup, PRESENCE_BULK_LIMIT);

  try {
    const results = await Promise.all(chunks.map((c) => getPresence(c)));
    const allItems = results.flatMap((r) => r.items);
    useStorePresence.getState().setSnapshot(allItems);
  } catch (err) {
    // Per contract §9: surface to console; affected userIds remain
    // "unknown" (undefined in store) rather than flipping to offline.
    console.error("[presence] Failed to refetch visible presence:", err);
  }
}

/**
 * Debounced refetch. Used on socket connect/reconnect so a flap during
 * token refresh doesn't hammer REST.
 */
export function scheduleRefetchVisiblePresence(): void {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    void refetchVisiblePresence();
  }, RECONNECT_REFETCH_DEBOUNCE_MS);
}

export function applyPresenceUpdate(update: IPresenceUpdate): void {
  useStorePresence.getState().applyUpdate(update);
}

export function resetPresence(): void {
  if (refetchTimer) {
    clearTimeout(refetchTimer);
    refetchTimer = null;
  }
  useStorePresence.getState().reset();
}
