import { beforeEach, describe, expect, it } from "vitest";

import { useStorePresence } from "../use-store-presence";

beforeEach(() => {
  useStorePresence.getState().reset();
});

describe("useStorePresence", () => {
  describe("visibility refcount", () => {
    it("registers and exposes visible user ids", () => {
      useStorePresence.getState().registerUsers(["a", "b"]);
      expect(useStorePresence.getState().getVisibleUserIds().sort((a, b) => a.localeCompare(b))).toEqual([
        "a",
        "b",
      ]);
    });

    it("dedups across multiple registrations without losing references", () => {
      const { registerUsers, unregisterUsers, getVisibleUserIds } =
        useStorePresence.getState();

      registerUsers(["a"]);
      registerUsers(["a", "b"]);
      expect(getVisibleUserIds().sort((a, b) => a.localeCompare(b))).toEqual(["a", "b"]);

      // Decrement a once — it should still be visible because count was 2.
      unregisterUsers(["a"]);
      expect(getVisibleUserIds().sort((a, b) => a.localeCompare(b))).toEqual(["a", "b"]);

      // Decrement a again — now it drops out.
      unregisterUsers(["a"]);
      expect(getVisibleUserIds()).toEqual(["b"]);
    });

    it("does not go negative when unregistering more than registered", () => {
      useStorePresence.getState().unregisterUsers(["never-registered"]);
      expect(useStorePresence.getState().getVisibleUserIds()).toEqual([]);
    });

    it("is a no-op for empty input", () => {
      useStorePresence.getState().registerUsers([]);
      useStorePresence.getState().unregisterUsers([]);
      expect(useStorePresence.getState().getVisibleUserIds()).toEqual([]);
    });
  });

  describe("setSnapshot", () => {
    it("populates byUserId from a REST response", () => {
      useStorePresence.getState().setSnapshot([
        {
          userId: "a",
          isOnline: true,
          connectionCount: 2,
          lastChangedAt: "2026-06-24T09:00:00.000Z",
        },
        {
          userId: "b",
          isOnline: false,
          connectionCount: 0,
          lastChangedAt: null,
        },
      ]);

      const state = useStorePresence.getState();
      expect(state.byUserId.a).toEqual({
        isOnline: true,
        connectionCount: 2,
        lastChangedAt: "2026-06-24T09:00:00.000Z",
      });
      expect(state.byUserId.b).toEqual({
        isOnline: false,
        connectionCount: 0,
        lastChangedAt: null,
      });
    });

    it("merges with existing entries (does not wipe other users)", () => {
      useStorePresence.getState().setSnapshot([
        {
          userId: "a",
          isOnline: true,
          connectionCount: 1,
          lastChangedAt: null,
        },
      ]);
      useStorePresence.getState().setSnapshot([
        {
          userId: "b",
          isOnline: false,
          connectionCount: 0,
          lastChangedAt: null,
        },
      ]);

      const state = useStorePresence.getState();
      expect(state.byUserId.a?.isOnline).toBe(true);
      expect(state.byUserId.b?.isOnline).toBe(false);
    });
  });

  describe("applyUpdate", () => {
    it("writes the WS transition timestamp into lastChangedAt", () => {
      useStorePresence.getState().applyUpdate({
        userId: "a",
        isOnline: true,
        connectionCount: 1,
        timestamp: "2026-06-24T10:00:00.000Z",
      });

      expect(useStorePresence.getState().byUserId.a).toEqual({
        isOnline: true,
        connectionCount: 1,
        lastChangedAt: "2026-06-24T10:00:00.000Z",
      });
    });

    it("overwrites any prior REST snapshot for that user", () => {
      useStorePresence.getState().setSnapshot([
        {
          userId: "a",
          isOnline: false,
          connectionCount: 0,
          lastChangedAt: "2026-06-24T09:00:00.000Z",
        },
      ]);
      useStorePresence.getState().applyUpdate({
        userId: "a",
        isOnline: true,
        connectionCount: 1,
        timestamp: "2026-06-24T10:00:00.000Z",
      });

      expect(useStorePresence.getState().byUserId.a?.isOnline).toBe(true);
      expect(useStorePresence.getState().byUserId.a?.lastChangedAt).toBe(
        "2026-06-24T10:00:00.000Z",
      );
    });

    it("is idempotent for redundant updates", () => {
      const update = {
        userId: "a",
        isOnline: true,
        connectionCount: 1,
        timestamp: "2026-06-24T10:00:00.000Z",
      };
      useStorePresence.getState().applyUpdate(update);
      useStorePresence.getState().applyUpdate(update);

      expect(useStorePresence.getState().byUserId.a).toEqual({
        isOnline: true,
        connectionCount: 1,
        lastChangedAt: "2026-06-24T10:00:00.000Z",
      });
    });
  });

  describe("reset", () => {
    it("clears both byUserId and refCounts", () => {
      useStorePresence.getState().registerUsers(["a", "b"]);
      useStorePresence.getState().setSnapshot([
        {
          userId: "a",
          isOnline: true,
          connectionCount: 1,
          lastChangedAt: null,
        },
      ]);

      useStorePresence.getState().reset();

      expect(useStorePresence.getState().byUserId).toEqual({});
      expect(useStorePresence.getState().getVisibleUserIds()).toEqual([]);
    });
  });
});
