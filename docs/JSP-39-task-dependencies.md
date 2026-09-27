# Task dependencies — blocked by / blocks (JSP-39)

> **Status:** Implemented · **Branch/PR:** `feat/JSP-39-task-dependencies` @ `f5764b8` · **Date:** 2026-09-28

## Overview

A task's detail sidebar now has a **Dependencies** section: a "Blocked by" and a "Blocks" list, a popover picker to link another task in either direction, one-click removal, and navigation to linked tasks. Data path: `dependency.service.ts` → cache-backed hooks on `['dependencies', taskId]` → `features/TaskDetail/dependencies/`. The cache/invalidation design (non-optimistic adds, optimistic removals, blocked-task route addressing) is recorded in CLAUDE.md → Data flow; this doc doesn't restate it.

## Key decisions

- **Scoped down from the Flowboard design mock** — only blocked-by/blocking. The mock's Related/Duplicate kinds, flip-direction button, undo toasts, and move-to-Done warnings were dropped: the backend (JSP-33) models only `blocks` edges, and the rest is on the ticket's out-of-scope list.
- **Picker candidates come from the loaded board store** (the contract's "the loaded board works") — so tasks not on the current board (e.g. some subtasks) aren't offered even though the API would accept them. Excluding both existing lists prevents only the *direct* cycle; longer cycles are deliberately left to the server's 409.
- **The picker renders only after the dependencies GET resolves** — before that it can't know what's already linked, so it would offer duplicates and flash.
- **Optimistic activity entries are direction-gated**: only written when the *blocked* (route) task is the one being viewed. A "blocks" change records activity on the other task's feed — logging it here too would double-count once invalidation refetches.
- **Viewer gating reuses the project-members query** (`useGetProjectMembers` + `normalizeProjectRole`); role unknown/loading → read-only. UX-only — the server's 403 is the enforcement.
- **Direction select is a native `<select>`** (as in the mock) rather than shadcn `Select` — one fewer portal primitive inside an already-custom combobox, with built-in keyboard/AT behavior.

## Affected files

| File | Role |
|---|---|
| `src/types/dependency.type.ts` (new) | `IDependencyTask`, `ITaskDependencies`, `DependencyDirection` |
| `src/types/activity.type.ts` | `task_dependency_added/removed` actions + `DependencyChangePayload` |
| `src/services/dependency.service.ts` (new) | GET/POST/DELETE one-liners (DELETE carries a JSON body) |
| `src/features/TaskDetail/dependencies/index.tsx` (new) | Section: grouped lists, rows, remove, navigation, role gating |
| `src/features/TaskDetail/dependencies/dependency-picker.tsx` (new) | Popover picker: direction, search, combobox/listbox keyboard nav |
| `src/features/TaskDetail/dependencies/dependency-edge.ts` (new) | Single source of the route/blocker mapping |
| `src/features/TaskDetail/dependencies/hooks/use-task-dependencies.ts` (new) | Query hook |
| `src/features/TaskDetail/dependencies/hooks/use-add-dependency.ts` (new) | Add mutation (cancels in-flight GET before caching the 201 view) |
| `src/features/TaskDetail/dependencies/hooks/use-remove-dependency.ts` (new) | Remove mutation (optimistic, snapshot rollback) |
| `src/features/TaskDetail/activity/activity-item.tsx` | Renders the two new activity actions |
| `src/features/TaskDetail/index.tsx`, `task-detail-sidebar/index.tsx` | Wiring (`projectId` prop, section placement) |
| `CLAUDE.md` | Data-flow entry for the feature |
| `dependencies/tests/*` (6 files, new), `services/tests/dependency.service.test.ts` (new), `activity/tests/activity-item.test.tsx` | Tests |

## Usage

- Open any task → sidebar → **Dependencies** (below Due date).
- **Add:** the `+` button (members+ only) → pick *Blocked by…* or *Blocking…* → search by title/ticket → click, or `↑`/`↓` + `Enter`; `Esc` closes. A cycle rejection surfaces the server's 409 message as a toast and leaves the popover open.
- **Remove:** hover a row → `X` (also reachable by keyboard focus).
- **Navigate:** click a row to open that task; rows without a `ticket_id` are plain text.
- Viewers see the lists read-only. No flags/env.

## Testing

- `src/features/TaskDetail/dependencies/tests/` (hooks + components), `src/services/tests/dependency.service.test.ts`, dependency cases in `activity/tests/activity-item.test.tsx`. Run: `pnpm test --run src/features/TaskDetail/dependencies src/services/tests/dependency.service.test.ts`.
- The native `<select>` is also ARIA `combobox` (its entries `option`s) — query the search input by accessible name and candidates `within()` the listbox, or counts break.
- The popover test stub exposes the controlled `open` state (`data-open` + a toggle) — keep it when testing open/close behavior.
- Keyboard scroll-follow is asserted by spying `Element.prototype.scrollIntoView` and checking `mock.contexts` for the active option.

## Maintenance notes

- **Route/blocker mapping changes only in `dependency-edge.ts`** — every route is addressed by the blocked task; both hooks and their invalidations derive from it.
- Linked-task navigation assumes the **current project**; a blocker later moved to another project opens with the wrong board loaded (the summary has no `project_id`). Fix needs a backend contract addition — not ticketed.
- Per-row remove pending state tracks only the latest `mutate`; rapid double-removals can send a duplicate DELETE (harmless — the endpoint is idempotent).
- Ticket out-of-scope follow-ups (not ticketed): board-card "blocked" badges, blocking Done moves while blockers are open, realtime dependency updates, cross-project links.
