import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type {
  IAttachmentUploader,
  IResponse,
  IResponseMeta,
  ITaskAttachment,
} from "@/types";

export const TASK_ID = "9c2d7f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f";

export function makeUploader(overrides: Partial<IAttachmentUploader> = {}): IAttachmentUploader {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "son@example.com",
    full_name: "Son Nguyen",
    role: "backend_developer",
    avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=SN",
    is_active: true,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}

export function makeAttachment(overrides: Partial<ITaskAttachment> = {}): ITaskAttachment {
  return {
    id: "5b1e0c1a-7d2e-4f3a-9b8c-1d2e3f4a5b6c",
    task_id: TASK_ID,
    file_name: "login-bug.png",
    content_type: "image/png",
    size_bytes: 482133,
    uploaded_by: makeUploader(),
    created_at: "2026-09-26T10:00:00.000Z",
    ...overrides,
  };
}

export function makePage(
  data: ITaskAttachment[],
  meta: Partial<IResponseMeta> = {},
): IResponse<ITaskAttachment[]> {
  return {
    data,
    meta: { page: 1, limit: 20, total: data.length, totalPages: 1, ...meta },
  };
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
