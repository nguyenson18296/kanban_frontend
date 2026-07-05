import { httpClient } from "@/lib/http-client";
import type {
  ISubscriptionStatus,
  ISubscriberListResponse,
} from "@/types";

export const getSubscriptionStatus = (taskId: string, signal?: AbortSignal) => {
  return httpClient.get<ISubscriptionStatus>(
    `/tasks/${taskId}/subscription/me`,
    signal,
  );
};

export const subscribeToTask = (taskId: string) => {
  return httpClient.post<ISubscriptionStatus>(`/tasks/${taskId}/subscription`);
};

export const unsubscribeFromTask = (taskId: string) => {
  // 204 No Content (idempotent) — httpClient resolves to undefined.
  return httpClient.delete<void>(`/tasks/${taskId}/subscription`);
};

export const getSubscribers = (taskId: string, signal?: AbortSignal) => {
  return httpClient.get<ISubscriberListResponse>(
    `/tasks/${taskId}/subscribers`,
    signal,
  );
};
