# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanban board application: a **client-only single-page app** built with React 19, TypeScript, and Vite 7. Features are implemented (boards, columns, drag-and-drop tasks, task detail, subtasks, comments, activity feed, notifications, auth, real-time updates).

**There is NO backend in this repo, NO Next.js, NO SSR, and NO React Server Components.** Everything ships to the browser. Ignore any guidance about RSC / server actions / server components / streaming SSR / Next.js routing or metadata — none of it applies.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build` (runs `tsr generate && tsc -b && vite build` — TanStack Router codegen, then type-check, then bundle)
- **Lint:** `pnpm lint` (`eslint .`, flat config)
- **Test:** `pnpm test` (Vitest, watch mode) — use `pnpm test --run` for a single non-watch pass
- **Preview prod build:** `pnpm preview`

Package manager is **pnpm** (pinned `pnpm@10.15.1`). Husky git hooks run **`pnpm lint` on pre-commit** and **`pnpm test --run` on pre-push**.

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
- `features/<PascalCase>/` — route-level feature modules (KanbanBoard, TaskDetail, Dashboard, LoginPage), each with a default-exported `index.tsx`. Routes import a feature's `index.tsx`. Features **do not import each other's UI**, but a feature may reuse another feature's colocated data/mutation hooks (e.g. TaskDetail imports KanbanBoard's `useGetBoard` / `useUpdateTask` / `useMoveTaskToColumn`).
- `components/<PascalCase>/` — shared/reusable components (usually `index.tsx` + kebab-case siblings). `components/ui/` — shadcn primitives (flat, kebab-case single files).
- `hooks/` — shared hooks (`use-*.ts`). Data-fetching/mutation hooks are **colocated per-feature** under a nested `hooks/` folder.
- `services/*.service.ts` — thin, stateless API modules (build URL/body, return a typed `httpClient` call). No React/Query/state.
- `stores/use-store-*.ts` — Zustand stores. `types/*.type.ts` — domain types, re-exported via the `@/types` barrel.
- `lib/` — `http-client` (fetch wrapper, `HttpError`, auto Bearer + 401 refresh-and-retry), `query-client`, `utils` (`cn`), cookie/jwt helpers.
- `providers/`, `config/env.ts`, `utils/`, `constants/`.

Path alias `@/` → `./src` (declared in `vite.config.ts`, `tsconfig.app.json`, `tsconfig.json`). Prefer `@/` for intra-`src` imports.

**Data flow:** `service` → colocated Query hook (`useQuery`/`useMutation`) → the hook pushes server data into a Zustand store inside `queryFn` → components read the store via atomic selectors. This is a deliberate trade-off: the Query cache stays the owner of fetching/staleness, while the store holds a mutable copy the board can patch optimistically. Components never call services directly and never call `fetch` directly.

## Adding something — quick map

- **New component** → `components/<Dir>/index.tsx` (shared) or inside the owning `features/<Feature>/`.
- **New API call** → add a one-liner to `services/*.service.ts`, then a colocated Query/mutation hook under the feature's `hooks/`.
- **New route** → add a file in `routes/` (thin wrapper rendering a feature); the route tree regenerates on `pnpm build`/`tsr generate`.
- **New shared state** → `stores/use-store-<domain>.ts`.
- **New domain type** → `types/<name>.type.ts`, re-export via the `@/types` barrel.

## Key Conventions

- **File/dir naming:** top-level `features/` and `components/` dirs are **PascalCase**; source files inside are **kebab-case** `.tsx`. New files: kebab-case. The only current exceptions are `features/LoginPage/LoginForm.tsx` (legacy) and test files, which mirror the subject's name (kebab-case `status-submenu.test.tsx`, or PascalCase `AvatarGroup.test.tsx` when the component is PascalCase). Data/mutation hooks are `use-*.ts`, one hook per file. Tests are colocated in a `tests/` subfolder next to the code.
- **cva variants** are extracted into a sibling `<name>-variants.ts` file **only when the variants const is reused/exported** (Button, Badge, Toggle); one-off private variants stay inline in the `.tsx` (Tabs, Field). This split keeps the component file satisfying `react-refresh/only-export-components`.
- **Env vars:** the *intended* pattern is to expose `VITE_*` through `config/env.ts`. Today `config/env.ts` only wraps `VITE_WS_URL`; `VITE_API_BASE_URL` is read directly in `lib/http-client.ts`. New env access should go through `config/env.ts`.

## Code Quality Conventions

Grounded in how this codebase already works, plus durable review/perf/design rules. Do **not** re-document what ESLint or `tsc --strict` already enforce.

### React & rendering (React Compiler is on)
- The compiler auto-memoizes, so **avoid manual `useMemo`/`useCallback`/`React.memo`** — add one only for a non-render concern the compiler can't cover (e.g. a stable callback ref, as in `assignee-submenu.tsx`) or a rare measured bail-out. The compiler does **not** fix the following — still do them:
  - **Derive, don't store-and-sync.** Compute values from props/state during render; do not mirror props into state via `useEffect`. To reset state on prop change, use a `key`, not an effect.
  - **Never define a component inside another component.** Hoist to module scope and pass props — a nested definition remounts every render (lost focus/state).
  - **Lazy `useState` init** — use `useState(() => …)` for values built from `localStorage`, `JSON.parse`, index/Map construction, or DOM reads.
  - **Run discrete user actions in the event handler**, not by flipping state and reacting in an effect (avoids double POST on submit / drag-drop).
  - **Ternary over `&&` for numeric conditions** (`count ? <Badge/> : null`) so a literal `0` never renders — relevant to counters/badges.
- Prefer **functional `setState`** updaters; Zustand actions must build **new objects/collections** (spread / `new Map()`), never mutate in place (referential equality drives re-renders — this rule is commented in the stores).
- **React 19 APIs:** pass `ref` as a **normal prop — no `forwardRef`** (the `ui/` primitives already do this); read context with **`use(Context)`** rather than `useContext`. Older stragglers still use the React 18 form (`DueDateDropdown/trigger.tsx` + `Editor/mention-list.tsx` use `forwardRef`; `use-websocket.ts` uses `useContext`) — match the `ui/` pattern in new/edited code.

### Component composition & APIs
- Avoid **boolean-prop proliferation** (`isEditing`, `isThread`, `isDMThread`, …) — each flag doubles the state space and breeds impossible states. Prefer **explicit variant components** and **compound components** that share state through a context (the pattern Radix and the `TaskContextMenu` / dropdown submenus already follow) over one monolith driven by mode flags.
- Prefer **`children`** for static composition over `renderHeader` / `renderX` render-prop callbacks; reach for a render prop only when the parent must pass data *back* to the child (e.g. a list item renderer).
- Extract a shared abstraction once a pattern is used in **3+ places** — don't pre-abstract a single use.

### State (Zustand)
- Stores live in `stores/use-store-<domain>.ts`, export `useStore<Domain>` from `create<T>((set) => …)`, with the state+actions interface as the generic. The `persist` middleware is used **only** for state that must survive reload (the user store).
- **Subscribe with atomic selectors** — `useStore((s) => s.field)`, one value per selector — never destructure the whole store (that re-renders on any change; the compiler does not memoize Zustand subscriptions). For object/array selectors use `useShallow`, or return a **module-level stable empty constant** as the fallback to avoid infinite re-render loops.
- Outside render (event callbacks, effect cleanup, non-hook helpers) read stores imperatively via `useStore.getState()`.

### Data layer (services + TanStack Query)
- Services are one-liners returning `httpClient.<verb><T>(...)`. All React Query lives in colocated hooks; mutation input is a single named-args object.
- **Query keys** are literal arrays with a string entity prefix (`['board', projectId]`, `['activities', taskId]`). Keep the key identical at the read site and every `invalidateQueries` site. Use **single quotes** and keep primitive params in keys.
- **Mutations invalidate rather than hand-patch** the cache (in `onSettled`); a task mutation that affects the board and its activity log must invalidate **both** `['board']` and `['activities', id]`. Optimistic UI is done by editing the Zustand store and reverting it in `onError`.
- Query defaults are centralized in `query-client.ts` (no `refetchOnWindowFocus`, 5-min `staleTime`, retry stops at 3 and never retries `HttpError` with `status < 500`, mutations never retry) — do not re-specify these per hook without reason.

### Types, forms & validation
- Domain types are declared then exported together at the bottom (`export type { … }`), re-exported through the `@/types` barrel. API shapes are **snake_case** (they match the backend).
- **TS `enum` is a build error** here (`erasableSyntaxOnly`). Model enums as a plain string-literal union for simple cases (`Priority` in `task.type.ts`), or a `const` object + derived union when the runtime values are needed (`NotificationType` in `notification.type.ts`). Both patterns exist; pick based on whether you need the values at runtime.
- **Validate external data only at true system boundaries** — router/URL params, form input, socket payloads, third-party responses — with Zod. Do **not** re-validate data your own authenticated backend just returned (TS types are erased at runtime; internal re-validation is churn).
- **Keep types and runtime guards in sync**: if code defends a field with `?.`/`??`, the type must mark it optional (and vice-versa).
- Multi-field / validated forms use **RHF + Zod** (`standardSchemaResolver`, `zod/v4`, `z.infer` as the `useForm` generic, always `defaultValues`; `register` for native inputs, `<Controller>` for custom/shadcn controls, errors as `<p className="text-sm text-destructive">`). Trivial single-field inline edits may use plain `useState` + a manual trim/no-op-guard handler.

### Realtime & error handling
- Socket lifecycle lives in the framework-agnostic `SocketManager` (`services/socket-manager.ts`), driven by callbacks and consumed via `useWebSocket()` (throws outside `WebSocketProvider`). Events are colon-namespaced (`notification:new`). Treat socket payloads as untrusted — validate before use.
- For `{ success: false, message }` result envelopes, every caller must **surface `message`** to the user (sonner) or deliberately swallow it with a comment saying why. Do not attach `onError`/`.catch` to a function that already catches-and-returns.

### Client-side performance
- **Grounded in the codebase:** store **high-frequency transient values** (drag deltas, scroll/pointer position) in `useRef` and mutate the DOM directly — reserve `useState` for values that must drive UI. Directly relevant to the @dnd-kit board handlers.
- **Aspirational — not yet in the codebase; apply when adding such features:**
  - Code-split heavy, non-initial UI (the Tiptap editor is currently statically imported; large dialogs) with `React.lazy` + `Suspense`; optionally preload via `void import()` on hover/focus.
  - For heavy filtering/search over large lists, keep the query in `useState` and read `useDeferredValue(query)`; the compiler memoizes the derived list — **no manual `useMemo`**.
  - Add `{ passive: true }` to scroll/wheel/touchstart listeners that never call `preventDefault()`. For long lists (board columns, activity feeds) apply CSS `content-visibility: auto` + `contain-intrinsic-size`.
  - Wrap any direct `localStorage`/`sessionStorage` access in `try/catch`, **version the keys**, and never persist tokens/PII. Do run-once init at module scope with a module-level guard, not in a `useEffect([])` (StrictMode double-invokes effects in dev).

### Styling
- Tailwind v4 is CSS-first in `src/index.css` — tokens are oklch semantic CSS vars mapped via `@theme inline`; dark mode is a `.dark` class. Use **semantic utilities** (`bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`) — never raw hex/rgb.
- All class merging goes through **`cn()` in `src/lib/utils.ts`**, which is a **customized** shadcn `cn` (it extracts `text-*` classes so tailwind-merge won't dedupe text color/size). Do not let the shadcn CLI regenerate this file back to the stock version.
- Use the unified `radix-ui` namespace imports and the `data-slot` pattern that existing `ui/` primitives follow.

### Testing
- Vitest runs through the React Compiler and the `@` alias (see `vitest.config.ts`); env is happy-dom; **globals are disabled** — explicitly `import { describe, it, expect, vi, … } from 'vitest'`. Setup: `src/test-setup.ts` (jest-dom matchers). Shared fixtures live in `@/test-factories`: `createUser`/`createTask` take a `Partial<T>` overrides object; `createColumn(id, name, color)` / `createAssignee(id, name)` take **positional** args.
- Component tests use Testing Library + `userEvent.setup()` with awaited actions, query by accessible role/name/text, and mock data hooks / Zustand stores / flaky Radix-portal & @dnd-kit primitives with `data-testid` stubs. `afterEach`: `cleanup()` + `vi.clearAllMocks()` for components; `vi.restoreAllMocks()` / `useRealTimers()` for hook/timer tests.
- **Test the defensive branches**: every `??`/`||` fallback, `try/catch`, early return, and any fetcher wrapping a network call needs a test (simulate reject/timeout/5xx). After changing a function signature, grep tests/`vi.mock` for stale `toHaveBeenCalledWith(...)` — a typecheck won't catch those.

### UI quality & security
- **Sanitize** any `dangerouslySetInnerHTML` and unsafe URL/rich-text input with `dompurify` (as the comment renderer does).
- **A11y floor on the custom interactive surfaces** — the @dnd-kit board (keyboard-operable drag, visible focus) and the Radix dropdown/dialog primitives. Respect `prefers-reduced-motion`; keep empty/error states directional (say what happened and how to act).
- This is a client SPA — **never inline secrets/PII** into bundled code; only genuinely-public config belongs in the browser.
