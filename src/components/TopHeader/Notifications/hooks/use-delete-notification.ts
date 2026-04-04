import { useMutation } from "@tanstack/react-query";
import { deleteNotification } from "@/services/notification.service";

export const useDeleteNotification = () => {
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
  });
};
