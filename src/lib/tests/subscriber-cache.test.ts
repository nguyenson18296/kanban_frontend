import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import {
  addSubscribersToCache,
  makeSubscriber,
  removeSubscriberFromCache,
  restoreSubscribers,
  subscribersKey,
} from "../subscriber-cache";
import type { ISubscriberListResponse } from "@/types";

const sub = (id: string, source: "assigned" | "mentioned" | "commented" | "manual") =>
  makeSubscriber({ id, full_name: id.toUpperCase(), avatar_url: null }, source, "2026-07-04T00:00:00.000Z");

const items = (qc: QueryClient, taskId: string) =>
  qc.getQueryData<ISubscriberListResponse>(subscribersKey(taskId))?.items.map((s) => s.user_id);

describe("addSubscribersToCache", () => {
  it("dedupes within the additions batch and against existing items (first occurrence wins)", () => {
    const qc = new QueryClient();
    qc.setQueryData(subscribersKey("t1"), { items: [sub("a", "assigned")] });

    addSubscribersToCache(qc, "t1", [
      sub("a", "mentioned"), // dup of existing → skipped
      sub("b", "commented"), // new
      sub("b", "mentioned"), // dup within batch → skipped
    ]);

    expect(items(qc, "t1")).toEqual(["a", "b"]);
    const data = qc.getQueryData<ISubscriberListResponse>(subscribersKey("t1"));
    expect(data?.items.find((s) => s.user_id === "b")?.source).toBe("commented");
  });

  it("is a no-op when the list is not cached (avoids seeding a partial list)", () => {
    const qc = new QueryClient();
    addSubscribersToCache(qc, "t1", [sub("a", "assigned")]);
    expect(qc.getQueryData(subscribersKey("t1"))).toBeUndefined();
  });
});

describe("removeSubscriberFromCache", () => {
  it("removes by user_id and leaves an uncached list untouched", () => {
    const qc = new QueryClient();
    qc.setQueryData(subscribersKey("t1"), { items: [sub("a", "manual"), sub("b", "assigned")] });
    removeSubscriberFromCache(qc, "t1", "a");
    expect(items(qc, "t1")).toEqual(["b"]);

    removeSubscriberFromCache(qc, "t2", "a"); // uncached → no-op
    expect(qc.getQueryData(subscribersKey("t2"))).toBeUndefined();
  });
});

describe("restoreSubscribers", () => {
  it("removes the cached entry when the snapshot is undefined (setQueryData(undefined) is ignored)", () => {
    const qc = new QueryClient();
    qc.setQueryData(subscribersKey("t1"), { items: [sub("a", "manual")] });
    restoreSubscribers(qc, "t1", undefined);
    expect(qc.getQueryData(subscribersKey("t1"))).toBeUndefined();
  });

  it("restores the exact snapshot when defined", () => {
    const qc = new QueryClient();
    qc.setQueryData(subscribersKey("t1"), {
      items: [sub("a", "manual"), sub("b", "assigned")],
    });
    restoreSubscribers(qc, "t1", { items: [sub("a", "manual")] });
    expect(items(qc, "t1")).toEqual(["a"]);
  });
});
