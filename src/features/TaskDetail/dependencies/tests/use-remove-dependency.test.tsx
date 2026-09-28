import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRemoveDependency } from "../hooks/use-remove-dependency";
import { removeTaskDependencies } from "@/services/dependency.service";
import { HttpError } from "@/lib/http-client";
import type { ITaskDependencies } from "@/types";
import { createQueryWrapper, makeDependencies, makeDependencyTask } from "./test-utils";

vi.mock("@/services/dependency.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
});

const CURRENT = "task-current";
const OTHER = "task-other";

function seededView(): ITaskDependencies {
  return makeDependencies({
    blocked_by: [makeDependencyTask({ id: OTHER, ticket_id: "KAN-12" })],
    blocks: [makeDependencyTask({ id: OTHER, ticket_id: "KAN-12" })],
  });
}

describe("useRemoveDependency", () => {
  it("blocked_by: deletes on the current task and optimistically drops the entry from blocked_by only", async () => {
    let resolveDelete: () => void = () => {};
    vi.mocked(removeTaskDependencies).mockImplementation(
      () => new Promise((resolve) => { resolveDelete = () => resolve(undefined); }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(["dependencies", CURRENT], seededView());

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });

    // Optimistic: entry gone before the server answers, and only from blocked_by.
    await waitFor(() => {
      const view = queryClient.getQueryData<ITaskDependencies>(["dependencies", CURRENT]);
      expect(view?.blocked_by).toEqual([]);
      expect(view?.blocks).toHaveLength(1);
    });
    expect(removeTaskDependencies).toHaveBeenCalledWith(CURRENT, [OTHER]);
    resolveDelete();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("blocks: deletes on the other task with the current task's id and drops the entry from blocks", async () => {
    vi.mocked(removeTaskDependencies).mockResolvedValue(undefined);
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(["dependencies", CURRENT], seededView());

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });
    result.current.mutate({ direction: "blocks", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeTaskDependencies).toHaveBeenCalledWith(OTHER, [CURRENT]);
    const view = queryClient.getQueryData<ITaskDependencies>(["dependencies", CURRENT]);
    expect(view?.blocks).toEqual([]);
    expect(view?.blocked_by).toHaveLength(1);
  });

  it("restores the snapshot and toasts when the server rejects", async () => {
    vi.mocked(removeTaskDependencies).mockRejectedValue(
      new HttpError(500, "DELETE /tasks/x/dependencies failed with status 500", {
        statusCode: 500,
        message: "Internal server error",
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    const seeded = seededView();
    queryClient.setQueryData(["dependencies", CURRENT], seeded);

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(["dependencies", CURRENT])).toEqual(seeded);
    expect(toast.error).toHaveBeenCalledWith("Internal server error");
  });

  it("invalidates both tasks' dependencies and the route task's activities when settled", async () => {
    vi.mocked(removeTaskDependencies).mockResolvedValue(undefined);
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(["dependencies", CURRENT], seededView());
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });
    // Removing "current blocks other" — the route (blocked) task is the OTHER task.
    result.current.mutate({ direction: "blocks", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dependencies", CURRENT] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dependencies", OTHER] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activities", OTHER] });
  });
});
