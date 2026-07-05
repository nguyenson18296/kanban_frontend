import { useQuery } from "@tanstack/react-query";

import { getSubscribers } from "@/services/subscription.service";
import { subscribersKey } from "@/lib/subscriber-cache";

export function useSubscribers(taskId: string) {
  return useQuery({
    queryKey: subscribersKey(taskId),
    queryFn: ({ signal }) => getSubscribers(taskId, signal),
    enabled: !!taskId,
  });
}
