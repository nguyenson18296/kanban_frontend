import { useInfiniteQuery } from "@tanstack/react-query";
import { getActivities } from "@/services/activity.service";

const ACTIVITIES_PER_PAGE = 20;

export const useGetActivities = (taskId: string) => {
  return useInfiniteQuery({
    queryKey: ["activities", taskId],
    queryFn: ({ pageParam }) =>
      getActivities(taskId, { page: pageParam, limit: ACTIVITIES_PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};
