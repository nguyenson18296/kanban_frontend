import { httpClient } from "@/lib/http-client";
import type { IPresenceListResponse, IPresenceState } from "@/types";

export const PRESENCE_BULK_LIMIT = 100;

export function getPresence(
  userIds: string[],
): Promise<IPresenceListResponse> {
  if (userIds.length === 0) return Promise.resolve({ items: [] });
  if (userIds.length > PRESENCE_BULK_LIMIT) {
    return Promise.reject(
      new Error(
        `getPresence accepts at most ${PRESENCE_BULK_LIMIT} userIds — chunk before calling.`,
      ),
    );
  }
  const params = new URLSearchParams({ userIds: userIds.join(",") });
  return httpClient.get<IPresenceListResponse>(`/presence?${params.toString()}`);
}

export function getMyPresence(): Promise<IPresenceState> {
  return httpClient.get<IPresenceState>("/presence/me");
}
