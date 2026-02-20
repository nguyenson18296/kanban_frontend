import { QueryClient } from '@tanstack/react-query';
import { HttpError } from './http-client.ts';

function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= 3) return false;
  if (error instanceof HttpError && error.status < 500) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
