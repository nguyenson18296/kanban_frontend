import { httpClient } from "@/lib/http-client";
import type { INotification, INotificationUnreadCount, IResponse, IQueryParams } from "@/types";

const NOTIFICATIONS_API_URL = '/notifications';

export const getNotifications = (params: IQueryParams) => {
  const queryParams = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] != null)
      .map(([key, value]) => [key, String(value)])
  );
  return httpClient.get<IResponse<INotification[]>>(`${NOTIFICATIONS_API_URL}?${queryParams.toString()}`);
}

export const getNotificationsUnreadCount = () => {
  return httpClient.get<INotificationUnreadCount>(`${NOTIFICATIONS_API_URL}/unread-count`);
}

export const readNotifications = (ids: string[]) => {
  return httpClient.patch<void>(`${NOTIFICATIONS_API_URL}/read`, { ids });
}

export const deleteNotification = (id: string) => {
  return httpClient.delete<void>(`${NOTIFICATIONS_API_URL}/${id}`);
}
