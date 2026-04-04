import { useQuery } from "@tanstack/react-query";
import { getNotificationsUnreadCount } from "@/services/notification.service";

export const useGetUnreadCount = () => {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getNotificationsUnreadCount,
  });
};
