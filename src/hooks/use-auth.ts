import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../lib/http-client.ts';
import type { User } from '@/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => httpClient.get<User>('/auth/me', signal),
  });
}
