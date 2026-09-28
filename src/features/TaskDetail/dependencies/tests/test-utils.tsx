import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { IDependencyTask, ITaskDependencies } from "@/types";

export function makeDependencyTask(
  overrides: Partial<IDependencyTask> = {},
): IDependencyTask {
  return {
    id: "9f1c2b3a-1d2e-4f50-9a6b-7c8d9e0f1a2b",
    ticket_id: "KAN-12",
    title: "Design schema",
    status: "open",
    column_id: 1,
    ...overrides,
  };
}

export function makeDependencies(
  overrides: Partial<ITaskDependencies> = {},
): ITaskDependencies {
  return { blocked_by: [], blocks: [], ...overrides };
}

/** Real QueryClientProvider with retries off; exposes the client for cache seeding/asserts. */
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}
