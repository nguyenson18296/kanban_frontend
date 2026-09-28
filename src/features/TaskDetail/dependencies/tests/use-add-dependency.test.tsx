import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAddDependency } from "../hooks/use-add-dependency";
import { addTaskDependencies } from "@/services/dependency.service";
import { HttpError } from "@/lib/http-client";
import { createQueryWrapper, makeDependencies, makeDependencyTask } from "./test-utils";

vi.mock("@/services/dependency.service");
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
});

const CURRENT = "task-current";
const OTHER = "task-other";

describe("useAddDependency", () => {
  it("blocked_by: posts the other task as a blocker of the current task and caches the response", async () => {
    const view = makeDependencies({ blocked_by: [makeDependencyTask({ id: OTHER })] });
    vi.mocked(addTaskDependencies).mockResolvedValue(view);
    const { queryClient, wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useAddDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addTaskDependencies).toHaveBeenCalledWith(CURRENT, [OTHER]);
    // The 201 body is the route task's full view — written straight into its key.
    expect(queryClient.getQueryData(["dependencies", CURRENT])).toEqual(view);
  });

  it("blocks: posts the current task as a blocker of the other task and caches under the other task's key", async () => {
    const view = makeDependencies({ blocked_by: [makeDependencyTask({ id: CURRENT })] });
    vi.mocked(addTaskDependencies).mockResolvedValue(view);
    const { queryClient, wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useAddDependency(), { wrapper });
    result.current.mutate({ direction: "blocks", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addTaskDependencies).toHaveBeenCalledWith(OTHER, [CURRENT]);
    expect(queryClient.getQueryData(["dependencies", OTHER])).toEqual(view);
  });

  it("invalidates the other side's dependencies and the route task's activities on success", async () => {
    vi.mocked(addTaskDependencies).mockResolvedValue(makeDependencies());
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dependencies", OTHER] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activities", CURRENT] });
  });

  it("cancels an in-flight GET so its stale response cannot overwrite the fresh 201 view", async () => {
    const staleView = makeDependencies();
    const freshView = makeDependencies({ blocked_by: [makeDependencyTask({ id: OTHER })] });
    vi.mocked(addTaskDependencies).mockResolvedValue(freshView);
    const { queryClient, wrapper } = createQueryWrapper();

    // A GET for the same key is still in flight when the POST resolves.
    let resolveStale: (view: typeof staleView) => void = () => {};
    void queryClient
      .fetchQuery({
        queryKey: ["dependencies", CURRENT],
        queryFn: () => new Promise<typeof staleView>((resolve) => { resolveStale = resolve; }),
      })
      .catch(() => {}); // cancellation rejects this promise — expected

    const { result } = renderHook(() => useAddDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    resolveStale(staleView);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryClient.getQueryData(["dependencies", CURRENT])).toEqual(freshView);
  });

  it("surfaces the server's 409 cycle message and leaves the cache untouched", async () => {
    const message = 'Adding "KAN-12" would create a dependency cycle';
    vi.mocked(addTaskDependencies).mockRejectedValue(
      new HttpError(409, "POST /tasks/x/dependencies failed with status 409", {
        statusCode: 409,
        message,
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    const seeded = makeDependencies({ blocks: [makeDependencyTask()] });
    queryClient.setQueryData(["dependencies", CURRENT], seeded);

    const { result } = renderHook(() => useAddDependency(), { wrapper });
    result.current.mutate({ direction: "blocked_by", currentTaskId: CURRENT, otherTaskId: OTHER });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(message);
    // No optimistic write for adds — a rejected link must leave no phantom entry.
    expect(queryClient.getQueryData(["dependencies", CURRENT])).toEqual(seeded);
  });
});
