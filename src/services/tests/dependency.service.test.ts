import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTaskDependencies,
  addTaskDependencies,
  removeTaskDependencies,
} from "../dependency.service";
import { httpClient } from "@/lib/http-client";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

const TASK_ID = "33333333-3333-4333-8333-333333333333";
const BLOCKER_ID = "9f1c2b3a-1d2e-4f50-9a6b-7c8d9e0f1a2b";

describe("dependency service", () => {
  it("getTaskDependencies fetches the task's dependencies and passes the abort signal", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ blocked_by: [], blocks: [] });
    const controller = new AbortController();

    await getTaskDependencies(TASK_ID, controller.signal);

    expect(httpClient.get).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/dependencies`,
      controller.signal,
    );
  });

  it("addTaskDependencies posts the blocker ids as blocked_by_ids", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ blocked_by: [], blocks: [] });

    await addTaskDependencies(TASK_ID, [BLOCKER_ID]);

    expect(httpClient.post).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/dependencies`,
      { blocked_by_ids: [BLOCKER_ID] },
    );
  });

  it("removeTaskDependencies sends DELETE with a blocked_by_ids JSON body", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(undefined);

    await removeTaskDependencies(TASK_ID, [BLOCKER_ID]);

    // The body must ride on DELETE — the backend requires it (+ Content-Type).
    expect(httpClient.delete).toHaveBeenCalledWith(
      `/tasks/${TASK_ID}/dependencies`,
      { blocked_by_ids: [BLOCKER_ID] },
    );
  });
});
