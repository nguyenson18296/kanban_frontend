import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useRecordRecentTask } from "../use-record-recent-task";
import { useStoreRecentTasks } from "@/stores/use-store-recent-tasks";

afterEach(() => {
  useStoreRecentTasks.setState({ recentByProject: {} });
  window.localStorage.clear();
});

describe("useRecordRecentTask", () => {
  it("records the opened ticket for the project", () => {
    renderHook(() => useRecordRecentTask("p1", "KAN-7"));

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual(["KAN-7"]);
  });

  it("records nothing until the ticket is known, then records it once loaded", () => {
    const { rerender } = renderHook(
      ({ ticketId }: { ticketId?: string }) => useRecordRecentTask("p1", ticketId),
      { initialProps: {} as { ticketId?: string } },
    );

    expect(useStoreRecentTasks.getState().recentByProject.p1).toBeUndefined();

    rerender({ ticketId: "KAN-7" });

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual(["KAN-7"]);
  });

  it("records again when the user moves to another task", () => {
    const { rerender } = renderHook(
      ({ ticketId }: { ticketId?: string }) => useRecordRecentTask("p1", ticketId),
      { initialProps: { ticketId: "KAN-7" } as { ticketId?: string } },
    );

    rerender({ ticketId: "KAN-8" });

    expect(useStoreRecentTasks.getState().recentByProject.p1).toEqual(["KAN-8", "KAN-7"]);
  });
});
