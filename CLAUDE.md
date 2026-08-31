# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanban board application: a **client-only single-page app** built with React 19, TypeScript, and Vite 7. Features are implemented (boards, columns, drag-and-drop tasks, task detail, subtasks, comments, activity feed, notifications, auth, real-time updates, task subscriptions).

**There is NO backend in this repo, NO Next.js, NO SSR, and NO React Server Components.** Everything ships to the browser. Ignore any guidance (including from the skills below) about RSC / server actions / server components / streaming SSR / Next.js routing or metadata — none of it applies.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build` (runs `tsr generate && tsc -b && vite build` — TanStack Router codegen, then type-check, then bundle)
- **Lint:** `pnpm lint` (`eslint .`, flat config)
- **Test:** `pnpm test` (Vitest, watch mode) — use `pnpm test --run` for a single non-watch pass
- **Preview prod build:** `pnpm preview`

Package manager is **pnpm** (pinned `pnpm@10.15.1`). Husky git hooks run **`pnpm lint` on pre-commit** and **`pnpm test --run` on pre-push**.

## Project Skills

Seven project-local skills live in `.claude/skills/`. Reach for the relevant one instead of re-deriving generic guidance — but the repo-specific rules in this file win wherever they conflict, and this is a client-only Vite SPA so every skill's Next.js/RSC/SSR content is not applicable.

- **react-patterns** — generic client-side React reasoning (hooks discipline, derive-don't-store, composition-over-flags, state-location decision tree, client Suspense + error-boundary placement, stable list keys / virtualization). *Relevance-limited:* skip its Server/Client-Component, `'use client'`/`'use server'`, and server-fetch sections; React 19 client form actions work in a SPA but this repo standardizes on RHF+Zod (see below); the React Compiler makes its "default to no memoization" a hard rule here.
- **react-performance** — the full ~70-rule perf catalog. *Relevance-limited:* ignore its Server-Component/API-route and Next.js-specific rules (`next/dynamic`, `next/image`, `React.cache`, hydration), but the parallelize-independent-awaits kernel from the Waterfalls category still applies client-side (don't chain sequential `await`s in a `queryFn`/service, don't serialize dependent `useQuery`s that could run in parallel). Its manual-memo category is review-only because the React Compiler is on.
- **frontend-a11y** — semantic HTML, ARIA, form labeling, keyboard nav, focus management, reduced motion. Invoke when building any interactive component or form. Apply its attributes through the RHF+Zod pattern below, not its raw-`useState` form example; prefer the Radix primitives over its hand-rolled modal/combobox.
- **react-testing** — general RTL + Vitest technique (accessible queries, awaited `userEvent`, `findBy`/`waitFor`, `renderHook` with a QueryClient, anti-patterns). *Not adopted here:* MSW and axe (neither is a dependency) and its react-router `MemoryRouter` example — mock at the service-module/store boundary instead (see Testing).
- **vite-patterns** — Vite config/env/proxy/build-splitting. *Version-skewed:* the skill targets Vite 8/Rolldown/SWC; this repo is Vite 7/Rollup configured with the Babel `@vitejs/plugin-react` running `babel-plugin-react-compiler`. Keep that setup — don't swap to `plugin-react-swc` and rewire the compiler for no reason. Its library-mode and SSR-externals sections don't apply.
- **frontend-patterns** — generic; prefer the more specific skills above and this file, which override it (its memoization / hand-rolled-`useQuery` / Context+reducer / controlled-form examples conflict with this repo's Compiler / TanStack Query / Zustand / RHF+Zod conventions).
- **ticket-review** — entry point for "review my branch/PR against the ticket." Note: this repo's tickets are `KAN-<n>` (e.g. `feat/KAN-78`), **not** `PRODUCT-*`, and there is **no** `Code Review Prompt.md` at the repo root — ignore those parts of the skill.

## Tech Stack

- **React 19** with the **React Compiler** enabled (`babel-plugin-react-compiler` via `@vitejs/plugin-react`) — automatic memoization
- **TypeScript 5.9** strict, bundler resolution, `noEmit` (Vite transpiles; `tsc -b` is type-check only via project references). Note: `erasableSyntaxOnly` + `verbatimModuleSyntax` are on — TS `enum`s and non-type-only value/type mixups are build errors.
- **Vite 7** (`@vitejs/plugin-react`, Babel-based)
- **TanStack Router** — file-based routing in `src/routes/`; route tree is code-generated to `src/routeTree.gen.ts` (git-ignored, lint-ignored, never hand-edit)
- **TanStack Query v5** — server-state fetching/caching (single `queryClient` in `src/lib/query-client.ts`)
- **Zustand v5** — shared client state (`src/stores/`)
- **React Hook Form 7 + Zod 4** — forms, wired with `standardSchemaResolver` from `@hookform/resolvers/standard-schema` and `import { z } from 'zod/v4'`
- **Tailwind CSS v4** (`@tailwindcss/vite`, CSS-first — **no `tailwind.config.js`**) + **shadcn/ui** (new-york, CSS variables) + **cva** + **clsx** + **tailwind-merge**
- **Radix UI** (unified `radix-ui` package, namespace imports), **@dnd-kit** (drag-and-drop), **Tiptap** (rich text), **socket.io-client** (realtime), **sonner** (toasts), **lucide-react**, **date-fns**, **dompurify**
- **Vitest 4** + **@testing-library/react** + **user-event** + **jest-dom** + **happy-dom**
- **ESLint 9** flat config (`typescript-eslint`, `react-hooks`, `react-refresh`) + **Husky**

## Architecture

`src/main.tsx` mounts `<RouterProvider>` (from `routeTree.gen`) plus the sonner `<Toaster>` inside `StrictMode`. There is no `<App />` component.

- `routes/` — TanStack **file-based** routes. `__root.tsx` wraps app-wide providers (`QueryClientProvider` → `TooltipProvider`); `_authenticated.tsx` is a pathless layout guard (checks `access_token` cookie, tries refresh, else `throw redirect({ to: '/login' })`) and wraps auth-only providers (`WebSocketProvider`). **Leaf routes are thin wrappers rendering a feature** (e.g. `login.tsx`); some routes are redirect-only with no component (`index.tsx`).
- `features/<PascalCase>/` — route-level feature modules (KanbanBoard, TaskDetail, Dashboard, LoginPage, Settings), each with a default-exported `index.tsx`. Routes import a feature's `index.tsx`. Features **do not import each other's UI**, but a feature may reuse another feature's colocated data/mutation hooks (e.g. TaskDetail imports KanbanBoard's `useGetBoard` / `useUpdateTask` / `useMoveTaskToColumn`; Settings reuses AssigneeDropdown's `useGetUsers`). A feature with several sub-pages (Settings) keeps its pages in `sections/*.tsx` and is routed as `settings/index.tsx` (redirect to the default section) + `settings/$section.tsx` whose `beforeLoad` validates the param and redirects unknown sections. The section registry (ids, nav groups, `isSettingsSection` guard) lives in `constants/settings-sections.ts` because the main `Sidebar` also reads it: under `/settings/*` the Sidebar swaps its main menu for a Back link + the settings sections (`components/Sidebar/settings-nav.tsx`).
- `components/<PascalCase>/` — shared/reusable components (usually `index.tsx` + kebab-case siblings). `components/ui/` — shadcn primitives (flat, kebab-case single files; includes `switch`, `select`, `textarea`, `radio-group`, `toggle-group` alongside the older set). Settings-specific building blocks (`SettingsCard`, `SwitchRow`, `SelectField`, `SegmentedControl`, `UsageMeter`, `FeatureToggleCard`) live under `features/Settings/components/`, not `ui/`.
- `hooks/` — shared hooks (`use-*.ts`). Data-fetching/mutation hooks are **colocated per-feature** under a nested `hooks/` folder.
- `services/*.service.ts` — thin, stateless API modules (build URL/body, return a typed `httpClient` call). No React/Query/state.
- `stores/use-store-*.ts` — Zustand stores. `types/*.type.ts` — domain types, re-exported via the `@/types` barrel.
- `lib/` — `http-client` (fetch wrapper, `HttpError`, auto Bearer + 401 refresh-and-retry), `query-client`, `utils` (`cn`), cookie/jwt helpers.
- `providers/`, `config/env.ts`, `utils/`, `constants/`.

Path alias `@/` → `./src` (declared in `vite.config.ts`, `tsconfig.app.json`, `tsconfig.json`). Prefer `@/` for intra-`src` imports.

**Data flow:** `service` → colocated Query hook (`useQuery`/`useMutation`) → components. Two consumption shapes coexist:
- **Mutable board** (the drag-and-drop surface): the hook pushes server data into a Zustand store *inside* `queryFn` (`use-get-board.ts` calls `setKanbanBoard(board)`), and components read the store via **atomic selectors**. The Query cache owns fetching/staleness; the store holds a mutable copy the board patches optimistically.
- **Read-only server data** (e.g. the subscription feature): consumed straight from the Query cache. `use-subscription-status.ts` / `use-subscribers.ts` are thin `useQuery` wrappers around the service call (with `signal` + `enabled: !!taskId`) and **no Zustand mirror**; `subscribers.tsx` reads `status?.subscribed` / `subscribersData?.items` directly.

Components never call services directly and never call `fetch` directly.

## Adding something — quick map

- **New component** → `components/<Dir>/index.tsx` (shared) or inside the owning `features/<Feature>/`.
- **New API call** → add a one-liner to `services/*.service.ts`, then a colocated Query/mutation hook under the feature's `hooks/`.
- **New route** → add a file in `routes/` (thin wrapper rendering a feature); the route tree regenerates on `pnpm build`/`tsr generate`.
- **New shared state** → `stores/use-store-<domain>.ts`.
- **New domain type** → `types/<name>.type.ts`, re-export via the `@/types` barrel.

## Key Conventions

- **File/dir naming:** top-level `features/` and `components/` dirs are **PascalCase**; source files inside are **kebab-case** `.tsx`. New files: kebab-case. The only current exceptions are `features/LoginPage/LoginForm.tsx` (legacy) and test files, which mirror the subject's name (kebab-case `status-submenu.test.tsx`, or PascalCase `AvatarGroup.test.tsx` when the component is PascalCase). Data/mutation hooks are `use-*.ts`, one hook per file. Tests are colocated in a `tests/` subfolder next to the code.
- **cva variants** are extracted into a sibling `<name>-variants.ts` file **only when the variants const is reused/exported** (Button, Badge, Toggle); one-off private variants stay inline in the `.tsx` (Tabs, Field). This split keeps the component file satisfying `react-refresh/only-export-components`.
- **Env vars:** the *intended* pattern is to expose `VITE_*` through `config/env.ts`. Today `config/env.ts` only wraps `VITE_WS_URL`; `VITE_API_BASE_URL` is read directly in `lib/http-client.ts`. New env access should go through `config/env.ts`. `VITE_` is **not** a security boundary — those values are inlined into the shipped bundle.

## Code Quality Conventions

Grounded in how this codebase already works, plus durable review/perf/design rules. Do **not** re-document what ESLint or `tsc --strict` already enforce.

### React & rendering (React Compiler is on)
For generic client-side React reasoning (hooks discipline, state-location tree, client Suspense/error-boundary placement, stable keys/virtualization) see the **react-patterns** skill; the repo-specific rules below take precedence.
- The compiler auto-memoizes, so **avoid manual `useMemo`/`useCallback`/`React.memo`** — add one only for a rare measured bail-out or a non-render concern (e.g. the explicit callback ref in `assignee-submenu.tsx` that focuses the search input on each open; the compiler likely memoizes it too, so confirm it's load-bearing before adding one).
- **The compiler does not replace hooks discipline** — you still must: derive-don't-store (compute from props/state in render; reset state with a `key`, not a syncing `useEffect`), never define a component inside another component, use lazy `useState(() => …)` init for expensive/`localStorage`/`JSON.parse` values, run discrete user actions in the event handler (not by flipping state and reacting in an effect — avoids double POST / drag-drop), and use a numeric ternary (`count ? <Badge/> : null`) so a literal `0` never renders. See **react-patterns** for the how-to.
- Prefer **functional `setState`** updaters; Zustand actions must build **new objects/collections** (spread / `new Map()`), never mutate in place (referential equality drives re-renders — this rule is commented in the stores).
- **React 19 APIs:** pass `ref` as a **normal prop — no `forwardRef`** (the `ui/` primitives already do this); read context with **`use(Context)`** rather than `useContext`. Older stragglers still use the React 18 form (`DueDateDropdown/trigger.tsx` + `Editor/mention-list.tsx` use `forwardRef`; `use-websocket.ts` uses `useContext`) — match the `ui/` pattern in new/edited code.

### Component composition & APIs
See **react-patterns** for the general composition reasoning; repo specifics:
- Avoid **boolean-prop proliferation** (`isEditing`, `isThread`, `isDMThread`, …) — each flag doubles the state space and breeds impossible states. Prefer **explicit variant components** and **compound components** that share state through a context (the pattern Radix and the `TaskContextMenu` / dropdown submenus already follow) over one monolith driven by mode flags.
- Prefer **`children`** for static composition over `renderHeader` / `renderX` render-prop callbacks; reach for a render prop only when the parent must pass data *back* to the child (e.g. a list item renderer).
- Extract a shared abstraction once a pattern is used in **3+ places** — don't pre-abstract a single use.

### State (Zustand)
- Stores live in `stores/use-store-<domain>.ts`, export `useStore<Domain>` from `create<T>((set) => …)`, with the state+actions interface as the generic. The `persist` middleware is used **only** for state that must survive reload (the user store; the preferences store; the active-project store backing the sidebar ProjectSwitcher — the latter two versioned `{ name, version }` and holding no PII/tokens). Theme is applied by `startThemeSync()` (`use-store-preferences.ts`, called once in `main.tsx`) toggling the `.dark` class; preferences pages read it via atomic selectors.
- **Subscribe with atomic selectors** — `useStore((s) => s.field)`, one value per selector — never destructure the whole store (that re-renders on any change; the compiler does not memoize Zustand subscriptions). Prefer selecting a **derived boolean** (`(s) => s.items.length > 0`) over selecting the raw value and deriving in the body. For object/array selectors use `useShallow`, or return a **module-level stable empty constant** as the fallback to avoid infinite re-render loops.
- Outside render (event callbacks, effect cleanup, non-hook helpers) read stores imperatively via `useStore.getState()`.

### Data layer (services + TanStack Query)
- Services are one-liners returning `httpClient.<verb><T>(...)`. All React Query lives in colocated hooks; mutation input is a single named-args object.
- **Query keys** are literal arrays with a string entity prefix (`['board', projectId]`, `['activities', taskId]`, `['subscription', taskId]`). Keep primitive params in the key. Read with the full key; **invalidate with the full key OR a deliberate prefix** — the board is read as `['board', projectId]` but invalidated by the bare `['board']` prefix to catch all projects (`use-update-assignees.ts`), whereas scoped keys like `['subscription', id]` / `['subscribers', id]` / `['activities', id]` are invalidated with the identical full key. (Quote style is inconsistent across the repo — older keys use single quotes, recent subscription/comment code uses double — match the neighboring file, don't reformat.)
- **Prefer invalidation over hand-patching** the cache — done in `onSuccess` *or* `onSettled` (both patterns are in use). A task mutation that affects the board and its activity log invalidates **both** `['board']` and `['activities', id]`. Because the backend **auto-subscribes** users on comment/@mention and on (self-)assignment, those mutations also invalidate `['subscription', id]` and `['subscribers', id]` (`use-create-comment.ts`, `use-update-assignees.ts`).
- **Two optimistic-update patterns — pick by whether the entity has a Zustand store:**
  - *Store-backed* (board, assignees): the **calling component** edits the Zustand store immediately and passes the prior value into `mutate` as a variable; the hook's job is to **revert on error** and **invalidate on success** — it has no `onMutate` (`use-update-assignees.ts` reverts via `updateStoreAssignees(id, variables.previousAssignees)` in `onError`).
  - *Cache-backed* (no store, e.g. subscriptions): the hook itself does the optimistic write in `onMutate` — `cancelQueries` → `getQueryData(key)` → `setQueryData(key, next)`, returning `{ previous }` as context; revert with `setQueryData(key, context.previous)` in `onError`; `invalidateQueries` in `onSettled` (`use-toggle-subscription.ts`).
- Query defaults are centralized in `query-client.ts` (no `refetchOnWindowFocus`, 5-min `staleTime`, retry stops at 3 and never retries `HttpError` with `status < 500`, mutations never retry) — do not re-specify these per hook without reason.

### Types, forms & validation
- Domain types are declared then exported together at the bottom (`export type { … }`), re-exported through the `@/types` barrel. API shapes are **snake_case** (they match the backend).
- **TS `enum` is a build error** here (`erasableSyntaxOnly`). Model enums as a plain string-literal union for simple cases (`Priority` in `task.type.ts`), or a `const` object + derived union when the runtime values are needed (`NotificationType` in `notification.type.ts`). Both patterns exist; pick based on whether you need the values at runtime.
- **Validate external data only at true system boundaries** — router/URL params, form input, socket payloads, third-party responses — with Zod. Do **not** re-validate data your own authenticated backend just returned (TS types are erased at runtime; internal re-validation is churn).
- **Keep types and runtime guards in sync**: if code defends a field with `?.`/`??`, the type must mark it optional (and vice-versa).
- Multi-field / validated forms use **RHF + Zod** (`standardSchemaResolver`, `zod/v4`, `z.infer` as the `useForm` generic, always `defaultValues`; `register` for native inputs, `<Controller>` for custom/shadcn controls, errors as `<p className="text-sm text-destructive">`). **RHF + React Compiler gotcha:** `register()` returns a fresh ref callback each render and `reset()` unregisters every field until those refs re-run; the compiler memoizes `register(...)` (the `useForm()` result is stable) so a compiled form goes blank after `reset()`. Any RHF form that calls `reset()` must opt out with `'use no memo'` at the top of the component (`Settings/sections/profile-form.tsx`), and prefer `useWatch` over `watch()` (the lint rule `react-hooks/incompatible-library` flags `watch`). The one existing form (`LoginForm.tsx`) currently wires only label `htmlFor`/`id`; new/edited forms should additionally point `aria-describedby` at the error `<p>` (give it `role="alert"`) and set `aria-invalid` on the field — see the **frontend-a11y** skill. Trivial single-field inline edits may use plain `useState` + a manual trim/no-op-guard handler.

### Realtime & error handling
- Socket lifecycle lives in the framework-agnostic `SocketManager` (`services/socket-manager.ts`), driven by callbacks and consumed via `useWebSocket()` (throws outside `WebSocketProvider`). Events are colon-namespaced (`notification:new`). Treat socket payloads as untrusted — validate before use.
- **Error contract:** the `httpClient` **throws `HttpError`** on a non-2xx response (there is no `{ success, message }` result envelope in this repo). Response envelopes: `IResponse<T> = { data, meta }` for paginated reads (`types/common.type.ts`), and `{ data, status, success }` on the project-members read (`IProjectMembersResponse` — the hook unwraps `data` and treats `success: false` as an error). Surface failures via the shared `toastError(error, fallback)` helper (`src/lib/toast-error.ts`) in a mutation `onError`: it prefers the **server** message (`HttpError.body.message` — the API returns `{ statusCode, message }`) and shows the human-readable `fallback` otherwise. Note `HttpError.message` is the internal `"METHOD /path failed…"` string, **not** user-facing. Don't attach a redundant `onError`/`.catch` to a helper that already catches-and-returns.

### Client-side performance
See the **react-performance** skill for the full catalog (apply the client-side categories only; the manual-memo category is review-only under the React Compiler).
- **Grounded in the codebase:** store **high-frequency transient values** (drag deltas, scroll/pointer position) in `useRef` and mutate the DOM directly — reserve `useState` for values that must drive UI. Directly relevant to the @dnd-kit board handlers.
- **Repo optimization targets when you build such features** (technique lives in the skill): the statically-imported Tiptap editor and large dialogs are `React.lazy` + `Suspense` split candidates (optionally preload via `void import()` on hover/focus); the board columns and activity feed are the long lists — give rows a **stable domain-id key** (never the array index), consider `content-visibility: auto` + `contain-intrinsic-size`, and drive any filter box with `useState` + `useDeferredValue` (the compiler memoizes the derived list — no manual `useMemo`). Add `{ passive: true }` to scroll/wheel/touch listeners that never `preventDefault()`.
- Wrap any direct `localStorage`/`sessionStorage` access in `try/catch`, **version the keys**, and **never persist tokens/PII**. Do run-once init at module scope with a module-level guard, not in a `useEffect([])` (StrictMode double-invokes effects in dev).

### Styling
- Tailwind v4 is CSS-first in `src/index.css` — tokens are oklch semantic CSS vars mapped via `@theme inline`; dark mode is a `.dark` class. Use **semantic utilities** (`bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`) — never raw hex/rgb.
- All class merging goes through **`cn()` in `src/lib/utils.ts`**, which is a **customized** shadcn `cn` (it extracts `text-*` classes so tailwind-merge won't dedupe text color/size). Do not let the shadcn CLI regenerate this file back to the stock version.
- Use the unified `radix-ui` namespace imports and the `data-slot` pattern that existing `ui/` primitives follow.

### Testing
For general RTL/Vitest technique (accessible queries, awaited `userEvent.setup()`, `findBy`/`waitFor`, `renderHook`, anti-patterns) see the **react-testing** skill. **Not adopted here:** MSW and axe (neither is a dependency) and the skill's react-router `MemoryRouter` example — mock at the boundaries below instead.
- Vitest runs through the React Compiler and the `@` alias (see `vitest.config.ts`); env is happy-dom; **globals are disabled** — explicitly `import { describe, it, expect, vi, … } from 'vitest'`. Setup: `src/test-setup.ts` (jest-dom matchers). Shared fixtures live in `@/test-factories`: `createUser`/`createTask` take a `Partial<T>` overrides object; `createColumn(id, name, color)` / `createAssignee(id, name)` take **positional** args.
- **Store-backed features:** mock the colocated data hook / Zustand store, and stub flaky Radix-portal & @dnd-kit primitives with `data-testid`. **Cache-backed features (no store):** `vi.mock('@/services/<x>.service')` + `vi.mocked(...)`, render inside a real `QueryClientProvider` with `retry: false`, plus a local `makeX(overrides)` factory (`activity/tests/subscribers.test.tsx`). Use Testing Library + `userEvent.setup()` with awaited actions, querying by accessible role/name/text. `afterEach`: `cleanup()` + `vi.clearAllMocks()` for components; `vi.restoreAllMocks()` / `useRealTimers()` for hook/timer tests.
- **Test the defensive branches**: every `??`/`||` fallback, `try/catch`, early return, and any fetcher wrapping a network call needs a test (simulate reject/timeout/5xx). After changing a function signature, grep tests/`vi.mock` for stale `toHaveBeenCalledWith(...)` — a typecheck won't catch those.

### UI quality & security
- **Sanitize** any `dangerouslySetInnerHTML` and unsafe URL/rich-text input with `dompurify` (as the comment renderer does).
- **A11y floor on the custom interactive surfaces** (see the **frontend-a11y** skill for the attribute-level how-to): the @dnd-kit board must stay keyboard-operable with visible focus; prefer the Radix dropdown/dialog primitives (they already trap/restore focus and do roving nav) over hand-rolling; icon-only buttons need `aria-label` + an `aria-hidden` icon. The subscribe toggle already models its state with `aria-pressed` + `aria-busy` (`subscribers.tsx`) — follow that pattern; announcing other dynamic non-navigation updates (e.g. the activity feed) via `aria-live`/`role="status"` is a target, not yet universal. Respect `prefers-reduced-motion`; keep empty/error states directional (say what happened and how to act).
- This is a client SPA — **never inline secrets/PII** into bundled code; only genuinely-public config belongs in the browser.
