import { useQuery } from "@tanstack/react-query";
import { getComments } from "@/services/comment.service";

export const useGetTaskComments = (taskId: string) => {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => getComments(taskId),
  });
}
