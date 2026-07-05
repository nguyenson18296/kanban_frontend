import { useQuery } from "@tanstack/react-query";

import { getSubscriptionStatus } from "@/services/subscription.service";

export function useSubscriptionStatus(taskId: string) {
  return useQuery({
    queryKey: ["subscription", taskId],
    queryFn: ({ signal }) => getSubscriptionStatus(taskId, signal),
    enabled: !!taskId,
  });
}
