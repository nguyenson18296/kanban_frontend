import { useQuery } from '@tanstack/react-query';
import { getMeProjects } from '@/services/project.service';

export const useGetMyProjects = (userId: string) => {
  return useQuery({
    queryKey: ['my-projects', userId],
    queryFn: getMeProjects,
    enabled: !!userId,
  });
};
