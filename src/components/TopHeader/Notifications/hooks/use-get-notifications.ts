import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/services/notification.service";
import type { IQueryParams } from "@/types";

export const useGetNotifications = (params: IQueryParams, userId: string) => {
  return useQuery({
    queryKey: ['notifications', params, userId],
    queryFn: () => getNotifications(params),
  });
}
