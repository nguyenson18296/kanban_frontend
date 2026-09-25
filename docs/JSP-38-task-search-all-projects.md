# All-projects task search (JSP-38)

> **Status:** Implemented · **Branch/PR:** `feat/JSP-38-task-search-all-projects` (commit `f1c25bc`) · **Date:** 2026-09-26

## Overview

The Cmd/Ctrl+F search overlay gains an **All projects** scope: server-ranked, whole-word
search across every project the user belongs to, alongside the client-side **This board**
scope (JAV-35). Opening a hit navigates to the task on its own board. Data path:
`services/search.service.ts` (`GET /search/tasks`, API from JAV-34) → cache-backed
`useInfiniteQuery` in `KanbanBoard/hooks/use-search-tasks.ts` → `board-search.tsx` /
`search-hit-row.tsx`. Architecture summary: CLAUDE.md § "Task search".

## Key decisions

- **A scope toggle inside the existing overlay, not a new surface** — the ticket pins look,
  keyboard and states to JAV-35 ("changes where results come from, not how search feels").
  Each scope keeps its own lag mechanism: `useDeferredValue` for the synchronous board scan
  (CPU smoothing), a 250 ms debounce for the server scope (request rate-limiting); the hook
  is fed `""` unless the overlay is open in the All-projects scope, so nothing ever fetches
  otherwise.
- **Snippets are parsed into React segments, never sanitize-and-injected** — DOMPurify can't
  be proven to strip `<script>` under happy-dom (CLAUDE.md § UI quality & security), and the
  server vocabulary is just `<mark>`. `decodeEntities` runs `&amp;` **last** so double-escaped
  text stays literal.
- **Own `ITaskSearchHit` type instead of reusing `ITask`** — the wire shape genuinely differs
  (string `status` vs the board's numeric, numeric label ids vs `ILabel`'s strings, nullable
  `ticket_id`); keeping the differences explicit beats widening board types.
- **Hits with `ticket_id: null` stay in the list, rendered non-navigable** (`aria-disabled`,
  no-op open) — filtering them out would desync the visible list from the server's `total`
  and page math.
- **Project names are joined client-side** from the cached `useGetProjects` list ("Unknown
  project" fallback) — the API returns only `project_id`, and backend changes are out of
  scope (JAV-34 shipped the contract as-is).
- **Cross-page dedupe in `select` + 30 s `staleTime`** — results drift between page fetches
  on a live board, so one task can land on two pages; duplicates would break React keys.
- **Service exported as `searchTasksAllProjects`** — `KanbanBoard/search.ts` already exports
  a client-side `searchTasks`; distinct names keep code and test mocks grep-able.

## Affected files

| File | Role |
|---|---|
| `src/services/search.service.ts` (new) | `searchTasksAllProjects` one-liner; `URLSearchParams` encoding, passes `signal` |
| `src/features/KanbanBoard/hooks/use-search-tasks.ts` (new) | `useInfiniteQuery` (key `['task-search', q]`), 200-code-point query cap, dedupe + server total in `select` |
| `src/features/KanbanBoard/search-hit-row.tsx` (new) | One hit row: snippet, project, ticket, priority, labels, assignees |
| `src/types/search.type.ts` (new) | `ITaskSearchHit` + sub-shapes per the backend contract |
| `src/types/index.ts` | Barrel re-export of `search.type` |
| `src/features/KanbanBoard/board-search.tsx` | Scope toggle, debounced server wiring, per-scope states, Load more, cross-project navigation |
| `src/features/KanbanBoard/search.ts` | Adds `serverSearchPhase`, `snippetSegments`, shared `decodeEntities` |
| `src/stores/use-store-recent-tasks.ts` | Adds `clearRecentTasks`; persist `migrate` degrades malformed payloads to `{}` |
| `CLAUDE.md` | Two-scope "Task search" section; new testing + security gotchas |
| Tests (new + updated, see Testing) | Service, hook, overlay, search module, store coverage |

## Usage

- On any board: **Cmd/Ctrl+F** or the "Search tasks" toolbar button → pick **All projects**
  in the scope toggle. Shift+mod+F still falls through to the browser's native find.
- Keyboard: ↑/↓ cycle, Ctrl/Cmd+Home/End jump, Enter opens the hit on its own board, Esc
  closes. Shift+Enter "Reveal" exists only in board scope.
- **Load more** paginates (20/page); the footer count is the server total across all pages.
- Matching is **whole-word** on titles and descriptions only — ticket IDs, labels, column
  names and comments are not searched server-side; board scope still covers those locally.
- No new env vars or routes; requests ride the existing `httpClient` (`VITE_API_BASE_URL`).

## Testing

- Run `pnpm test --run` (narrow: `pnpm test --run src/features/KanbanBoard`). New:
  `tests/board-search-all-projects.test.tsx` (incl. stale-response ordering, hostile-snippet
  rendering, null-ticket hits), `hooks/tests/use-search-tasks.test.tsx`,
  `services/tests/search.service.test.ts`; extended: `tests/board-search.test.tsx`,
  `tests/search.test.ts`, `stores/tests/use-store-recent-tasks.test.ts`.
- Overlay tests use real timers and ride out the 250 ms debounce with awaited
  `findBy*`/`waitFor` — don't convert to fake timers casually.
- Hook tests must read `data`/`hasNextPage` before acting — the `renderHook` + react-query
  tracked-properties gotcha, CLAUDE.md § Testing.
- Cache-backed test pattern (mock the service, real `QueryClientProvider`, `retry: false`)
  per CLAUDE.md § Testing; the overlay test also mocks `useRouter` and `project.service`.

## Maintenance notes

- Never render `hit.snippet` (or any future server-markup field) as HTML — extend
  `snippetSegments` if the server's snippet vocabulary grows.
- `changeScope` must keep ignoring the `""` that Radix `ToggleGroup` emits when the pressed
  item is re-clicked, or the scope deselects.
- Load more uses `aria-disabled` (not `disabled`) so focus isn't dropped mid-fetch, and
  refocuses the input when it unmounts with the last page; keep `isFetchingNextPage` out of
  `isCatchingUp` so pagination doesn't blank the `aria-live` count.
- The query cap (`MAX_QUERY_CODE_POINTS = 200`), page size and whole-word semantics mirror
  the backend contract (backend repo `docs/api-contracts/task-search.md`) — change together.
- Follow-up **JAV-36** (fuzzy/typo-tolerant server matching): when it lands, update the
  idle and empty-state copy, which currently explains whole-word matching and points users
  at "This board" for partial matches.
- Out of scope per the ticket, no frontend tickets yet: searching comments/projects/users/
  labels; saved searches and history (not ticketed). Null-`ticket_id` hits are visible but
  unopenable (not ticketed).
