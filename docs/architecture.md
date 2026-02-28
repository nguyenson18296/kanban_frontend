# Architecture: Data Flow

## Overview

This project uses a **hybrid Zustand + TanStack Query** pattern for state management:

- **TanStack Query** handles server synchronization (fetching, caching, retries, background refetch).
- **Zustand** holds the UI-facing state that components actually read from.
- **Components never read the query cache directly.** They subscribe to Zustand stores.

This separation produces a flicker-free UI with optimistic updates: Zustand is updated immediately (or via `queryFn` on fetch), and background refetches silently reconcile without triggering unnecessary re-renders.

## Layer Diagram

```
┌─────────────┐    reads     ┌──────────────┐  queryFn syncs  ┌───────────────┐
│  Component   │◄────────────│ Zustand Store │◄────────────────│ TanStack Query│
└─────────────┘              └──────────────┘                 └───────┬───────┘
       │                           ▲                                  │
       │ user action               │ optimistic update                │ fetch
       ▼                           │                                  ▼
┌─────────────┐              ┌─────┴────────┐                 ┌──────────────┐
│Mutation Hook │─────────────│ Zustand Store │                 │   Service    │
│  (onDragEnd, │  update     │  (moveTask,  │                 │    Layer     │
│   onClick)   │  store      │  reorderTask)│                 └──────┬───────┘
└──────┬───────┘             └──────────────┘                        │
       │ mutationFn                                                  ▼
       ▼                                                      ┌──────────────┐
┌──────────────┐                                              │  HTTP Client  │
│   Service    │──────────────────────────────────────────────►│  (fetch+JWT)  │
│    Layer     │                                              └──────┬───────┘
└──────────────┘                                                     │
                                                                     ▼
                                                                   API
```

## Layers

### HTTP Client — `src/lib/http-client.ts`

A thin wrapper around `fetch` that provides:

- **Automatic JWT refresh** — on a 401 response (except auth endpoints), the client refreshes the access token via `/auth/refresh` and retries the original request once.
- **Deduplication** — concurrent 401s share a single refresh promise (`refreshPromise`), preventing race conditions.
- **Token management** — `saveTokens()` decodes JWTs to compute `maxAge` for cookies; `clearTokens()` removes both tokens on unrecoverable auth failure.
- **Typed methods** — `httpClient.get<T>()`, `.post<T>()`, `.put<T>()`, `.patch<T>()`, `.delete<T>()`.
- **`HttpError`** — custom error class exposing `status` and optional `body` for downstream handling.

### Service Layer — `src/services/`

Thin typed wrappers over `httpClient`. No business logic, just endpoint mapping:

| File | Functions |
|---|---|
| `board.service.ts` | `getBoard()` |
| `task.service.ts` | `getTasks()`, `createTask()`, `updateTask()`, `moveTaskToColumn()`, `reorderTask()`, `updateTaskAssignees()` |
| `user.service.ts` | `getUsers()` |
| `auth.service.ts` | Auth-specific calls |

### Query Client — `src/lib/query-client.ts`

Global `QueryClient` configuration:

| Option | Value | Reason |
|---|---|---|
| `retry` | Up to 3, skip if `HttpError.status < 500` | Don't retry client errors (400, 403, 404) |
| `staleTime` | 5 min | Avoid unnecessary refetches for mostly-static board data |
| `gcTime` | 10 min | Keep cache slightly longer than stale window |
| `refetchOnWindowFocus` | `false` | Prevent surprise refetches that could conflict with optimistic state |
| Mutations `retry` | `false` | Mutations are not idempotent — never auto-retry |

### Query Hooks (fetch + sync to Zustand)

These hooks fetch from the API and **push the result into Zustand** inside `queryFn`:

**`use-get-board.ts`** — fetches the board and calls `setKanbanBoard(board)`:
```ts
queryFn: async () => {
  const board = await getBoard();
  setKanbanBoard(board);   // ← sync to Zustand
  return board;
},
```

**`use-get-users.ts`** — fetches users and calls `setUsers(users)`:
```ts
queryFn: async () => {
  const users = await getUsers();
  setUsers(users);         // ← sync to Zustand
  return users;
},
```

Components subscribe to the Zustand store, **not** `query.data`. This is deliberate — see [Key Patterns](#key-patterns).

### Zustand Stores — `src/stores/`

**`use-store-kanban-board.ts`** — holds the board and provides immutable update actions:
- `setKanbanBoard(board)` — replace the entire board (called by query hook)
- `updateTaskAssignees(taskId, assignees)` — immutable deep update of a task's assignees
- `moveTask(taskId, fromColumnId, toColumnId, position)` — remove from source column, insert at position in target column
- `reorderTask(columnId, taskId, newPosition)` — reorder within a single column

All updaters return **new objects** at every level (spread operators). Zustand uses referential equality — mutating in place won't trigger re-renders.

**`use-store-users-list.ts`** — holds the users list:
- `setUsers(users)` — replace the users array

### Mutation Hooks — `src/features/KanbanBoard/hooks/`

| Hook | Service call | On success/settled | Optimistic? |
|---|---|---|---|
| `use-move-task-to-column` | `moveTaskToColumn(id, columnId, position)` | `invalidateQueries(['board'])` on settled | Store updated before mutation (in `onDragEnd`) |
| `use-reorder-task` | `reorderTask(id, position)` | `invalidateQueries(['board'])` on settled | Store updated before mutation (in `onDragEnd`) |
| `use-update-task` | `updateTask(id, task)` | `invalidateQueries(['board'])` on success | No |
| `use-update-assignees` | `updateTaskAssignees(id, assignee_ids)` | `invalidateQueries(['board'])` on success; **rollback** on error | Yes, with rollback |

## Key Patterns

### Why No Flicker

Components read from **Zustand**, not the TanStack Query cache. When a background refetch completes:

1. `queryFn` calls `setKanbanBoard(board)` with the server response.
2. If the optimistic Zustand state already matches the server response, Zustand's referential equality check means **no re-render**.
3. If there's a difference, Zustand updates and the component re-renders with the corrected state.

This avoids the "loading → stale → fresh" flicker that happens when components read `query.data` directly.

### Optimistic Updates

The pattern differs by mutation type:

**Drag-and-drop (move/reorder):** Zustand is updated in `onDragEnd` *before* the mutation fires:
```
onDragEnd → moveTaskInStore() → moveTaskToColumnMutation()
                                       ↓
                              API call + invalidateQueries
                                       ↓
                              queryFn → setKanbanBoard() (silent reconcile)
```

**Assignee update:** Zustand is updated by the calling component before `mutate()` is called. On error, the mutation hook rolls back:
```ts
onError: (_error, variables) => {
  updateStoreAssignees(variables.id, variables.previousAssignees);
},
```

### Drag-and-Drop Dual State

The `Board` component (`src/features/KanbanBoard/index.tsx`) maintains **two sources of task data**:

1. **`itemsFromColumns`** — derived from the Zustand board state (reflects store updates like assignee changes)
2. **`items`** — local React state managed by dnd-kit's `move()` helper during drag

The `effectiveItems` pattern switches between them:
```ts
const effectiveItems = draggedTaskId ? items : itemsFromColumns;
```

- **Not dragging** → read from Zustand (reflects server state + optimistic updates)
- **Dragging** → read from local state (reflects in-progress drag position)

On `onDragEnd`, the local state is committed to Zustand via store actions, then the mutation fires.

## Data Flow Diagrams

### Query Flow: Fetch Board

```
1. Component mounts, calls useGetBoard()
2. TanStack Query triggers queryFn
3. queryFn calls getBoard() → httpClient.get('/board') → API
4. Response arrives
5. queryFn calls setKanbanBoard(board) → Zustand store updated
6. Component re-renders (subscribes to Zustand, not query.data)
```

### Mutation Flow: Move Task (Optimistic)

```
1. User drops task in new column (onDragEnd fires)
2. moveTaskInStore(taskId, fromCol, toCol, position)  ← Zustand updated immediately
3. moveTaskToColumnMutation({ id, columnId, position }) ← API call starts
4. Component already shows task in new position (from step 2)
5. API responds (success)
6. onSettled → invalidateQueries(['board'])
7. Background refetch → queryFn → setKanbanBoard(board)
8. If server state matches Zustand → no re-render (silent reconcile)
```

### Mutation Flow: Assignee Update (With Rollback)

```
1. User selects assignee in dropdown
2. Calling component updates Zustand: updateTaskAssignees(taskId, newAssignees)
3. mutate({ id, assignee_ids, previousAssignees })  ← API call starts
4. UI already shows new assignee (from step 2)

   Success path:
   5a. onSuccess → invalidateQueries(['board'])
   6a. Refetch reconciles silently

   Error path:
   5b. onError → updateStoreAssignees(id, previousAssignees)  ← rollback
   6b. UI reverts to original assignees
```

## Summary Table

| Hook | Purpose | Pattern | Cache Key |
|---|---|---|---|
| `useGetBoard` | Fetch board data | Query → sync to Zustand | `['board']` |
| `useGetUsers` | Fetch users list | Query → sync to Zustand | `['users']` |
| `useMoveTaskToColumn` | Move task between columns | Optimistic (store first) → mutate → invalidate | `['board']` |
| `useReorderTask` | Reorder task within column | Optimistic (store first) → mutate → invalidate | `['board']` |
| `useUpdateTask` | Update task fields | Mutate → invalidate on success | `['board']` |
| `useUpdateAssignees` | Update task assignees | Optimistic + rollback on error → invalidate | `['board']` |
