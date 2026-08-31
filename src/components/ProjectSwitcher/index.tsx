import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useStoreActiveProject } from "@/stores/use-store-active-project";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { IProject } from "@/types";

import { useGetProjects } from "./hooks/use-get-projects";
import { resolveTargetProject } from "./resolve-target-project";

/** Show the in-menu filter input only once the list is long enough to need it. */
const SEARCH_THRESHOLD = 8;

// Projects have no icon/avatar on the backend yet — derive a stable colored
// initial tile from the project id instead.
const TILE_COLORS = [
  "bg-[#5a5cf2]",
  "bg-[#0ea5e9]",
  "bg-[#10b981]",
  "bg-[#f59e0b]",
  "bg-[#ef4444]",
  "bg-[#8b5cf6]",
  "bg-[#ec4899]",
  "bg-[#14b8a6]",
];

function projectTileColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}

interface ProjectTileProps {
  project: IProject;
  size?: "default" | "sm";
}

function ProjectTile({ project, size = "default" }: ProjectTileProps) {
  const sizeClass =
    size === "sm" ? "h-6 w-6 rounded-md text-[10px]" : "h-8 w-8 rounded-lg text-sm";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-bold text-white ${sizeClass} ${projectTileColor(project.id)}`}
    >
      {project.name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Sidebar project switcher: shows the active project and lets the user jump
 * to any project they have access to. With a single project it still opens,
 * simply listing that one project marked as current.
 */
export default function ProjectSwitcher() {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeProjectId = useStoreActiveProject((s) => s.activeProjectId);
  const setActiveProjectId = useStoreActiveProject((s) => s.setActiveProjectId);
  const { data: projects, isLoading, isError } = useGetProjects();

  // Focus the search input when the menu opens (Content unmounts on close,
  // so this ref callback fires on each open) — same pattern as assignee-submenu.
  const searchRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading projects"
        className="mt-6 flex animate-pulse items-center gap-3 rounded-xl border border-[#334155] bg-white/5 px-3 py-2"
      >
        <div className="h-8 w-8 rounded-lg bg-white/10" />
        <div className="flex-1">
          <div className="h-2.5 w-24 rounded bg-white/10" />
          <div className="mt-1.5 h-2 w-12 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (isError || !projects || projects.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-[#334155] px-3 py-3 text-xs font-medium text-[#94a3b8]">
        {isError ? "Couldn't load projects." : "No projects yet."}
      </p>
    );
  }

  // Fall back to the first project when nothing is stored yet (or the stored
  // project no longer exists / is no longer accessible). The list is known
  // non-empty here, so the extra `?? projects[0]` only narrows away null.
  const activeProject = resolveTargetProject(projects, activeProjectId) ?? projects[0];

  const query = search.trim().toLowerCase();
  const visibleProjects = query
    ? projects.filter(
        (p) => p.name.toLowerCase().includes(query) || p.tag.toLowerCase().includes(query),
      )
    : projects;

  const handleSelect = (project: IProject) => {
    // Repair a stale stored id even when the selection matches the fallback.
    if (project.id !== activeProjectId) setActiveProjectId(project.id);
    if (project.id === activeProject.id) return;

    // The board store still holds the previous project's board (and the Query
    // cache could serve it as fresh, skipping the store-syncing queryFn) —
    // clear + invalidate so the old project's data is never shown.
    useStoreKanbanBoard.getState().clearKanbanBoard();
    // refetchType "none": only mark boards stale — an eager refetch of the
    // board being left could resolve late and clobber the store (its queryFn
    // syncs the store). Each board refetches when its route mounts.
    queryClient.invalidateQueries({ queryKey: ["board"], refetchType: "none" });
    // Project-scoped routes (board, task detail) don't exist in the new
    // project — land on its board instead. Project-agnostic pages stay put.
    if (location.pathname.startsWith("/projects/")) {
      navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mt-6 flex w-full items-center gap-3 rounded-xl border border-[#334155] bg-white/5 px-3 py-2 text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5a5cf2]"
        >
          <ProjectTile project={activeProject} />
          <span className="min-w-0 flex-1">
            <span className="sr-only">Switch project — current:</span>
            <span className="block truncate text-sm font-semibold leading-5 text-white">
              {activeProject.name}
            </span>
            <span className="block truncate text-xs font-medium leading-4 text-[#94a3b8]">
              {activeProject.tag}
            </span>
          </span>
          <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[#64748b]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[232px]">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {projects.length >= SEARCH_THRESHOLD && (
          <div className="px-1 pb-1">
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Printable keys belong to the input — keep them from
                // triggering the menu typeahead.
                if (e.key.length === 1) {
                  e.stopPropagation();
                  return;
                }
                // Radix ignores arrows coming from a non-item element — hand
                // focus to the first result so roving item nav takes over
                // (Escape/Tab still bubble to the menu and close it).
                if (e.key === "ArrowDown") {
                  const firstItem = e.currentTarget
                    .closest('[role="menu"]')
                    ?.querySelector<HTMLElement>('[role="menuitem"]');
                  if (firstItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    firstItem.focus();
                  }
                }
              }}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="h-8"
            />
          </div>
        )}
        <DropdownMenuSeparator />
        {visibleProjects.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No projects match “{search.trim()}”.
          </p>
        ) : (
          visibleProjects.map((project) => {
            const isActive = project.id === activeProject.id;
            return (
              <DropdownMenuItem key={project.id} onSelect={() => handleSelect(project)}>
                <ProjectTile project={project} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{project.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {project.tag}
                  </span>
                </span>
                {isActive ? (
                  <>
                    <Check aria-hidden="true" className="shrink-0 text-[#5a5cf2]" />
                    <span className="sr-only">(current project)</span>
                  </>
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
