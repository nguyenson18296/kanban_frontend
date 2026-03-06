import { useQuery } from "@tanstack/react-query";

import { getTaskByTicketId } from "@/services/task.service";

export const useGetTaskByTicketId = (ticketId: string) => {
  return useQuery({
    queryKey: ["task", ticketId],
    queryFn: () => getTaskByTicketId(ticketId),
  });
};
