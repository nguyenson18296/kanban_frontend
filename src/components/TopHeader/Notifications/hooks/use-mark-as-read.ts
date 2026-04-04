import { useMutation } from "@tanstack/react-query";
import { readNotifications } from "@/services/notification.service";

export const useMarkAllAsRead = () => {
  return useMutation({
    mutationFn: (ids: string[]) => readNotifications(ids),
  });
}
