import { afterEach, describe, expect, it } from "vitest";

import { useStoreRecentTasks } from "../use-store-recent-tasks";

afterEach(() => {
  useStoreRecentTasks.setState({ recentByProject: {} });
  window.localStorage.clear();
});

describe("useStoreRecentTasks", () => {
  it("records opened tickets newest first, per project", () => {
    const { recordRecentTask } = useStoreRecentTasks.getState();

    recordRecentTask("p1", "KAN-1");
    recordRecentTask("p1", "KAN-2");
    recordRecentTask("p2", "KAN-9");

    expect(useStoreRecentTasks.getState().recentByProject).toEqual({
      p1: ["KAN-2", "KAN-1"],
      p2: ["KAN-9"],
    });
  });

  it("moves a re-opened ticket to the front instead of duplicating it", () => {
    const { recordRecentTask } = useStoreRecentTasks.getState();

    recordRecentTask("p1", "KAN-1");
    recordRecentTask("p1", "KAN-2");
    recordRecentTask("p1", "KAN-1");

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual(["KAN-1", "KAN-2"]);
  });

  it("keeps at most 5 recent tickets per project", () => {
    const { recordRecentTask } = useStoreRecentTasks.getState();

    for (let i = 1; i <= 7; i++) recordRecentTask("p1", `KAN-${i}`);

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual([
      "KAN-7",
      "KAN-6",
      "KAN-5",
      "KAN-4",
      "KAN-3",
    ]);
  });

  it("keeps recents for at most the 10 most-recently-touched projects", () => {
    const { recordRecentTask } = useStoreRecentTasks.getState();

    for (let i = 1; i <= 11; i++) recordRecentTask(`p${i}`, "KAN-1");

    const map = useStoreRecentTasks.getState().recentByProject;
    expect(Object.keys(map)).toHaveLength(10);
    expect(map.p1).toBeUndefined();
    expect(map.p2).toEqual(["KAN-1"]);
    expect(map.p11).toEqual(["KAN-1"]);
  });

  it("migrates v1 payloads by keeping their shape", async () => {
    window.localStorage.setItem(
      "recent-tasks-store",
      JSON.stringify({ state: { recentByProject: { p1: ["KAN-9"] } }, version: 1 }),
    );

    await useStoreRecentTasks.persist.rehydrate();

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual(["KAN-9"]);
  });

  it("persists to versioned localStorage so recents survive a reload", () => {
    useStoreRecentTasks.getState().recordRecentTask("p1", "KAN-1");

    const raw = window.localStorage.getItem("recent-tasks-store");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as {
      state: { recentByProject: Record<string, string[]> };
      version: number;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.state.recentByProject.p1).toEqual(["KAN-1"]);
  });
});
