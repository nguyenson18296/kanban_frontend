import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskDependencies } from "../hooks/use-task-dependencies";
import { getTaskDependencies } from "@/services/dependency.service";
import { createQueryWrapper, makeDependencies, makeDependencyTask } from "./test-utils";

vi.mock("@/services/dependency.service");

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTaskDependencies", () => {
  it("fetches the task's dependencies with an abort signal and exposes both lists", async () => {
    const view = makeDependencies({ blocked_by: [makeDependencyTask()] });
    vi.mocked(getTaskDependencies).mockResolvedValue(view);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useTaskDependencies("task-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTaskDependencies).toHaveBeenCalledWith("task-1", expect.any(AbortSignal));
    expect(result.current.data).toEqual(view);
  });

  it("does not fetch while the task id is empty", () => {
    const { wrapper } = createQueryWrapper();

    renderHook(() => useTaskDependencies(""), { wrapper });

    expect(getTaskDependencies).not.toHaveBeenCalled();
  });
});
