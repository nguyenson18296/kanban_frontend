import type { IProject } from "@/types";

/**
 * Single owner of the active-project fallback order, shared by the
 * ProjectSwitcher and the /projects redirect route: the stored id when it
 * still exists, else the first accessible project, else null.
 */
export function resolveTargetProject(
  projects: IProject[],
  storedId: string | null,
): IProject | null {
  return projects.find((p) => p.id === storedId) ?? projects.at(0) ?? null;
}
