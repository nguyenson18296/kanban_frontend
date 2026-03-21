# Subtask Feature — Technical Documentation

> **Ticket:** KAN-52
> **Author:** Senior Frontend Engineer
> **Last updated:** 2026-03-15

---

## 1. Overview

The Subtask feature allows users to view, create, and manage sub-issues within a parent task's detail page. Each subtask is a full `ITask` entity that supports inline editing of status, assignees, priority, due date, and labels — all with optimistic UI updates.

### Feature scope

| Capability | Status |
|---|---|
| List subtasks under a parent task | Done |
| Inline status change (context menu) | Done |
| Inline assignee change (context menu) | Done |
| Inline priority change (context menu) | Done |
| Inline due date change (dropdown + context menu) | Done |
| Inline label change (dropdown) | Done |
| Create new subtask (form UI) | UI scaffold only |
| Delete subtask | Not started |

---

## 2. Architecture

### 2.1 Component tree

```
TaskDetail (page)                         ← route: /projects/:projectId/tasks/:taskId
├── TaskDetailHeader                      ← title, ticket ID, creator
├── TaskDetailDescription                 ← rich-text editor
├── Subtask                               ← subtask container (receives taskId)
│   ├── SubtaskItem[]                     ← one per subtask
│   │   └── TaskContextMenu              ← right-click wrapper
│   │       ├── StatusSubmenu
│   │       ├── AssigneeSubmenu
│   │       ├── PrioritySubmenu
│   │       └── DueDateSubmenu
│   └── FormCreateNew                     ← creation form (scaffold)
└── TaskDetailSidebar                     ← parent task metadata
```

### 2.2 File map

```
src/
├── features/TaskDetail/
│   ├── index.tsx                          # TaskDetail page — orchestrator
│   ├── task-detail-header.tsx             # Header display component
│   ├── subtask/
│   │   ├── index.tsx                      # Subtask container — fetches & lists
│   │   ├── item.tsx                       # SubtaskItem — row with optimistic state
│   │   ├── form-create-new.tsx            # Creation form (UI only)
│   │   ├── hooks/
│   │   │   └── use-get-subtasks.ts        # TanStack Query hook
│   │   └── tests/
│   │       └── item.test.tsx              # 16 unit tests
│   └── hooks/
│       └── use-update-task-labels.ts      # Shared label mutation hook
├── components/
│   ├── TaskContextMenu/
│   │   ├── index.tsx                      # Context menu shell + unified callback
│   │   ├── status-submenu.tsx             # Column/status picker
│   │   ├── assignee-submenu.tsx           # User search + toggle
│   │   ├── priority-submenu.tsx           # Priority level picker
│   │   └── due-date-submenu.tsx           # Preset date picker
│   └── TaskLabel/
│       └── stacked-labels.tsx             # Overlapping label badges
├── services/
│   └── task.service.ts                    # HTTP layer (subtask endpoints)
├── stores/
│   └── use-store-kanban-board.ts          # Zustand board store
└── types/
    └── task.type.ts                       # ITask, TAssignee, Priority
```

---

## 3. Data model

### 3.1 ITask (shared between parent tasks and subtasks)

```typescript
interface ITask {
  id: string;
  column_id: number;
  title: string;
  description: string;
  status: number;
  priority: Priority;            // "no_priority" | "urgent" | "high" | "medium" | "low"
  position: number;
  ticket_id: string;
  labels: ILabel[];
  assignees: TAssignee[];        // Pick<IUser, "id" | "full_name" | "avatar_url">
  due_date: string | null;       // ISO 8601
  creator: IUser;
  created_at: string;
  updated_at: string;
}
```

Subtasks are `ITask` entities — they share the same shape as board tasks, which means all existing mutation hooks and context menu components work without modification.

### 3.2 API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks/:taskId/subtasks` | List subtasks for a parent task |
| `POST` | `/tasks/:taskId/subtasks` | Create a subtask under a parent |
| `PATCH` | `/tasks/:id` | Update any task field (due_date, priority, label_ids, assignee_ids) |
| `PATCH` | `/tasks/:id/move` | Move task to another column (status change) |

---

## 4. Data flow

### 4.1 Fetching subtasks

```
TaskDetail
  └─ renders <Subtask taskId={task.id} />
       └─ useGetSubtasks(taskId)
            └─ TanStack Query
                 queryKey: ["subtasks", taskId]
                 queryFn:  GET /tasks/:taskId/subtasks
                 └─ returns { data: ITask[] }
                      └─ maps to <SubtaskItem task={subtask} /> per item
```

The `Subtask` container is self-contained — it only needs a `taskId` prop and fetches its own data. The parent `TaskDetail` page does not pass subtask data down.

### 4.2 Optimistic update strategy

SubtaskItem manages five local state fields that mirror the `task` prop:

```typescript
const [columnId, setColumnId]   = useState(task.column_id);
const [assignees, setAssignees] = useState(task.assignees);
const [dueDate, setDueDate]     = useState(task.due_date);
const [labels, setLabels]       = useState(task.labels);
const [priority, setPriority]   = useState(task.priority);
```

**Why local state is necessary:** The `task` prop comes from TanStack Query and only refreshes after a server round-trip. Local state provides instant UI feedback before the mutation completes.

Every update follows a three-step pattern:

```
User action
  │
  ├─ 1. setState(newValue)              ← immediate UI update (optimistic)
  ├─ 2. mutation({ id, payload })       ← async API call
  └─ 3. Query invalidation on settle    ← server reconciliation
```

### 4.3 Context menu callback flow

All four context menu submenus communicate back to `SubtaskItem` through a single unified callback:

```
TaskContextMenu
  └─ onTaskUpdate?: (partial: Partial<ITask>) => void
       │
       ├─ StatusSubmenu   → onTaskUpdate({ column_id: newColumnId })
       ├─ AssigneeSubmenu → onTaskUpdate({ assignees: [...] })
       ├─ PrioritySubmenu → onTaskUpdate({ priority: "high" })
       └─ DueDateSubmenu  → onTaskUpdate({ due_date: "2026-..." })
```

In `SubtaskItem`, the handler dispatches to the correct local state setter:

```typescript
const handleTaskUpdate = (partial: Partial<ITask>) => {
  if (partial.column_id !== undefined) setColumnId(partial.column_id);
  if (partial.assignees !== undefined) setAssignees(partial.assignees);
  if (partial.due_date !== undefined)  setDueDate(partial.due_date);
  if (partial.labels !== undefined)    setLabels(partial.labels);
  if (partial.priority !== undefined)  setPriority(partial.priority);
};
```

The `task` prop passed to `TaskContextMenu` always reflects the latest local state:

```typescript
<TaskContextMenu
  task={{ ...task, column_id: columnId, assignees, due_date: dueDate, labels, priority }}
  onTaskUpdate={handleTaskUpdate}
>
```

This ensures that modals and submenus (e.g. `EditDueDateModal`, `PrioritySubmenu`) always read current values, not stale props.

### 4.4 Complete update sequence (due date example)

```
1. User clicks date in DueDateDropdown
         │
2. handleDueDateChange(date)
   ├─ Guard: if (dueDate === date) return     ← skip no-op
   ├─ setDueDate(date)                        ← optimistic
   └─ updateTaskMutation({ id, task: { due_date: date } })
         │
3. API: PATCH /tasks/:id { due_date }
         │
4. onSettled → queryClient.invalidateQueries(["board"])
         │
5. Zustand store updates → board re-renders
```

### 4.5 Complete update sequence (status via context menu)

```
1. User right-clicks subtask → selects new status column
         │
2. StatusSubmenu.moveTask(columnId)
   ├─ moveTaskInStore(id, fromCol, toCol, 0)   ← Zustand optimistic
   ├─ moveTaskToColumnMutation(...)             ← API call
   └─ onTaskUpdate({ column_id: columnId })     ← callback to parent
         │
3. SubtaskItem.handleTaskUpdate({ column_id })
   └─ setColumnId(columnId)                     ← local optimistic
         │
4. Zustand selector re-evaluates:
   state.kanbanBoard.columns.find(col => col.id === columnId)?.color
         │
5. Status dot re-renders with new color
```

---

## 5. State management layers

The feature uses three complementary state layers:

| Layer | Technology | Scope | Purpose |
|---|---|---|---|
| Server cache | TanStack Query | Per-query | Source of truth after fetching; auto-refetch on invalidation |
| Client store | Zustand | Global (board) | Board-level optimistic updates (column colors, task positions); shared across components |
| Local state | React `useState` | Per-component | Subtask-level optimistic updates; instant UI feedback before server response |

### Why SubtaskItem needs local state (not just Zustand)

Subtasks are **not** part of the board's Zustand store. The store holds `kanbanBoard.columns[].tasks[]` — the board view. Subtasks are fetched separately via `useGetSubtasks` and live in TanStack Query's cache. Therefore, optimistic updates for subtask fields (due_date, labels, assignees, priority, column_id) must be managed via local `useState`.

The Zustand store **is** used for one thing: resolving `column_id → color` for the status dot, since column data is already loaded when the board fetches.

---

## 6. Key components

### 6.1 SubtaskItem (`subtask/item.tsx`)

A single row in the subtask list. Renders:

```
┌─[checkbox]─[status dot]─[title]─────────[labels] [due date] [avatars]─┐
└───────────────── wrapped in TaskContextMenu (right-click) ────────────┘
```

**Responsibilities:**
- Owns optimistic state for all mutable fields
- Handles due date and label changes via inline dropdowns
- Delegates status/assignee/priority/due-date changes to `TaskContextMenu` and syncs back via `onTaskUpdate`

**Equality guards (prevents redundant mutations):**
- Due date: `if (dueDate === date) return` — simple string comparison
- Labels: sorted ID join comparison — `prevIds.sort().join(",") === nextIds.sort().join(",")` — catches same-count-different-IDs cases

### 6.2 TaskContextMenu (`components/TaskContextMenu/index.tsx`)

Shared context menu component used by both board tasks and subtasks.

**Interface:**
```typescript
interface TaskContextMenuProps {
  task: ITask;
  children: ReactNode;
  onDelete?: (task: ITask) => void;
  onTaskUpdate?: (partial: Partial<ITask>) => void;
}
```

The `onTaskUpdate` callback is a unified channel that replaced four separate callback props (`onStatusChange`, `onAssigneesChange`, etc.). Each submenu fires it with the relevant `Partial<ITask>` slice after performing its own mutation.

**Menu structure:**
1. Status | Assignee | Priority | Due Date (submenus with mutations)
2. Rename (opens modal)
3. Mark as | Create related (placeholder submenus)
4. Move | Copy | Remind me (placeholder submenus)
5. Delete (destructive action)

### 6.3 StackedLabels (`components/TaskLabel/stacked-labels.tsx`)

Pure presentational component that renders labels as overlapping pills:

```
[Bug]         ← z-index: 2
  [Feature]   ← z-index: 1, margin-left: -8px
```

Extracted from `SubtaskItem` for reusability.

### 6.4 FormCreateNew (`subtask/form-create-new.tsx`)

UI scaffold for subtask creation. Currently renders:
- Content-editable title field with placeholder
- TipTap editor for description
- Priority and status dropdowns (hardcoded defaults)
- Cancel / Create buttons

**Not yet wired to API.** The `createSubtask` service function exists but isn't connected.

---

## 7. Testing

### 7.1 Test file: `subtask/tests/item.test.tsx`

**16 tests** covering SubtaskItem across 5 describe blocks:

| Block | Tests | Coverage |
|---|---|---|
| Rendering | 6 | Title, checkbox, status dot color, assignees, due date, labels |
| Status change | 1 | Context menu column change updates dot color |
| Due date change | 4 | Mutation call, skip-on-same, null removal, optimistic UI |
| Labels change | 4 | Mutation call, skip-on-same-IDs, different-IDs-same-count, optimistic UI |
| Assignees change | 1 | Context menu assignee update reflects in avatar group |

### 7.2 Mock strategy

All child components are mocked to isolate `SubtaskItem` logic. Mocks capture callback refs to simulate user interactions:

```typescript
// Example: capture onDueDateChange from DueDateDropdown mock
let capturedOnDueDateChange: ((date: string | null) => void) | undefined;

vi.mock("@/components/DueDateDropdown", () => ({
  default: ({ dueDate, onDueDateChange }) => {
    capturedOnDueDateChange = onDueDateChange;
    return <span data-testid="due-date">{dueDate ?? "No date"}</span>;
  },
}));

// In test: simulate user picking a date
act(() => capturedOnDueDateChange?.("2026-04-01T00:00:00.000Z"));
```

All callback invocations are wrapped in `act()` to prevent React state update warnings and ensure deterministic assertions.

### 7.3 Running tests

```bash
pnpm vitest run src/features/TaskDetail/subtask/tests/item.test.tsx
```

---

## 8. Design decisions

### 8.1 Unified `onTaskUpdate` callback

**Before:** `TaskContextMenu` accepted `onStatusChange`, `onAssigneesChange`, and would need additional callbacks for priority and due date — growing prop sprawl.

**After:** A single `onTaskUpdate(partial: Partial<ITask>)` handles all fields. Adding new editable fields to the context menu requires zero interface changes.

### 8.2 Subtasks reuse `ITask` type

Subtasks are first-class tasks in the backend. By sharing the `ITask` interface, all existing components (`TaskContextMenu`, `DueDateDropdown`, `TaskLabelDropdown`, `AvatarGroup`) work without modification. No subtask-specific types were needed.

### 8.3 Local state over Zustand for subtask optimistic updates

Subtasks don't live in the board's Zustand store — they're fetched independently via TanStack Query. Local `useState` in `SubtaskItem` provides immediate UI feedback without coupling subtask state to the board store.

### 8.4 Label equality via sorted ID comparison

```typescript
const prevIds = labels.map((l) => l.id).sort().join(",");
const nextIds = newLabels.map((l) => l.id).sort().join(",");
if (prevIds === nextIds) return;
```

A previous implementation compared `labels.length` only, which missed the case where a user swaps one label for another (same count, different IDs). Sorted ID join catches all permutations.

### 8.5 Column color from Zustand selector

```typescript
const statusColor = useStoreKanbanBoard(
  (state) => state.kanbanBoard?.columns.find((col) => col.id === columnId)?.color,
);
```

Board data (including columns with their colors) is already loaded via `useGetBoard` in the parent `TaskDetail` page and stored in Zustand. This avoids a separate API call to fetch column metadata.

---

## 9. Known limitations & future work

| Item | Notes |
|---|---|
| **FormCreateNew is not functional** | UI is scaffolded but not connected to `createSubtask` API. Needs form state, validation, and mutation wiring. |
| **No subtask deletion** | `onDelete` prop exists on `TaskContextMenu` but is not passed from `SubtaskItem`. |
| **No drag-and-drop reorder** | Subtask list is static. The `position` field exists on `ITask` and `reorderTask` API is available. |
| **No real-time sync** | If another user edits a subtask, the change won't appear until manual refetch or navigation. Could add WebSocket / polling. |
| **Stale local state on prop change** | If the parent re-fetches and the `task` prop updates, `useState(task.x)` initializers don't re-sync. This is acceptable because query invalidation is the reconciliation mechanism — but a `key={task.id + task.updated_at}` on SubtaskItem could force remount if needed. |
| **No error handling on mutations** | Optimistic updates succeed locally but API failures are not rolled back in the UI. Could add `onError` callbacks to mutations. |
