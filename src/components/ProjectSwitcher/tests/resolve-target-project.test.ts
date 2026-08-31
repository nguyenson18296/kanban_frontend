import { describe, expect, it } from "vitest";

import { resolveTargetProject } from "../resolve-target-project";
import type { IProject } from "@/types";

function makeProject(overrides: Partial<IProject> = {}): IProject {
  return {
    id: "p1",
    name: "Flowboard Core",
    tag: "FBC",
    description: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const PROJECTS = [makeProject(), makeProject({ id: "p2", name: "Design System", tag: "DS" })];

describe("resolveTargetProject", () => {
  it("returns the stored project when it exists in the list", () => {
    expect(resolveTargetProject(PROJECTS, "p2")?.id).toBe("p2");
  });

  it("falls back to the first project when the stored id is stale", () => {
    expect(resolveTargetProject(PROJECTS, "deleted-id")?.id).toBe("p1");
  });

  it("falls back to the first project when nothing is stored", () => {
    expect(resolveTargetProject(PROJECTS, null)?.id).toBe("p1");
  });

  it("returns null for an empty project list", () => {
    expect(resolveTargetProject([], "p1")).toBeNull();
    expect(resolveTargetProject([], null)).toBeNull();
  });
});
