import { useQuery } from "@tanstack/react-query";
import { getSubtasks } from "@/services/task.service";

export const useGetSubtasks = (taskId: string) => {
  return useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: () => getSubtasks(taskId),
  });
};
