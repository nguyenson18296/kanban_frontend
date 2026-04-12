import type { IProject, IResponse } from '@/types';
import { httpClient } from '@/lib/http-client';

export const getMeProjects = () => {
  return httpClient.get<IResponse<IProject[]>>('/users/me/projects');
}
