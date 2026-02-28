# Task Context Menu — Technical Design Document

## Overview

The Task Context Menu provides a right-click menu on task cards in the Kanban board. It exposes quick actions for modifying task properties (status, assignee, priority, labels), organizing tasks (move, copy, convert), and destructive operations (delete).

The menu uses shadcn/ui's `ContextMenu` components (built on Radix UI primitives), which provide accessible keyboard navigation, submenu support, and portal-based rendering out of the box.

### Key Distinction: Static vs Dynamic Menu Items

| Type | Description | Examples |
|------|-------------|----------|
| **Static** | Fixed actions that don't depend on backend data | Copy ID, Copy URL, Copy Title, Rename, Delete |
| **Dynamic** | Content populated from task data or API responses | Change priority, Add/remove labels, Add/remove assignees, Change status |

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────┐
│  Task.tsx (parent)                              │
│  - Owns task data (spread from ITask props)     │
│  - Owns local state (localPriority)             │
│  - Owns mutation hooks (useUpdateTask, etc.)    │
│  - Passes task + callbacks to TaskContextMenu   │
└────────────────┬────────────────────────────────┘
                 │  props: task, onChangePriority,
                 │         onDelete, ...
                 ▼
┌─────────────────────────────────────────────────┐
│  TaskContextMenu (wrapper)                      │
│  - Renders ContextMenu + ContextMenuTrigger     │
│  - Wraps children (the task card) via asChild   │
│  - Delegates to submenu components              │
│  - Static items handled inline                  │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
   Static     Dynamic   Dynamic
   Items      Submenu   Submenu
  (inline)   (Priority) (Assignee)
              calls      fetches
              callback   users via
              directly   hook, then
                         calls callback
```

### Design Principles

1. **TaskContextMenu is a thin wrapper** — it renders the menu shell and delegates actions upward via callbacks. It does not own mutation logic.
2. **Task.tsx coordinates mutations** — the parent component holds hooks (`useUpdateTask`, `useUpdateAssignees`) and Zustand store actions. Context menu callbacks trigger these handlers.
3. **Dynamic submenus fetch their own data** — submenus that need API data (e.g., assignee list, available labels) call their own query hooks internally, keeping the parent lean.
4. **Static items are defined at module scope** — no per-render allocations for items that never change.

---

## Component Structure

### File Layout

```
src/components/TaskContextMenu/
├── index.tsx                    # Main wrapper component
├── static-menu-items.tsx        # Static action items (Copy ID, Rename, etc.)
├── priority-submenu.tsx         # Priority selection submenu
├── assignee-submenu.tsx         # Assignee selection submenu
├── labels-submenu.tsx           # Label selection submenu
├── status-submenu.tsx           # Status/column selection submenu
└── types.ts                     # Shared types for menu callbacks
```

### Component Hierarchy

```tsx
<ContextMenu>
  <ContextMenuTrigger asChild>
    {children}  {/* The task card div */}
  </ContextMenuTrigger>

  <ContextMenuContent>
    {/* Group 1: Core task properties */}
    <StatusSubmenu />
    <AssigneeSubmenu />
    <PrioritySubmenu />
    <LabelsSubmenu />
    <ContextMenuItem>Change due date</ContextMenuItem>
    <ContextMenuItem>Rename...</ContextMenuItem>

    <ContextMenuSeparator />

    {/* Group 2: Static link/copy actions */}
    <ContextMenuItem>Add link...</ContextMenuItem>
    <ContextMenuItem>Make a copy...</ContextMenuItem>

    <ContextMenuSeparator />

    {/* Group 3: Organization */}
    <MoveSubmenu />
    <CopySubmenu />

    <ContextMenuSeparator />

    {/* Group 4: Destructive */}
    <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

## Static vs Dynamic Menus

### Static Menu Items

Static items perform actions that require no external data. Define them as module-level constants to avoid re-creation on each render.

```tsx
// static-menu-items.tsx
import { Link, Pencil, Copy } from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import type { ITask } from "@/types";

interface StaticMenuItemsProps {
  task: ITask;
}

export function CopyActions({ task }: Readonly<StaticMenuItemsProps>) {
  return (
    <>
      <ContextMenuItem
        onSelect={() => navigator.clipboard.writeText(task.id)}
      >
        <Copy className="size-4" />
        Copy ID
      </ContextMenuItem>

      <ContextMenuItem
        onSelect={() =>
          navigator.clipboard.writeText(
            `${window.location.origin}/task/${task.ticket_id}`,
          )
        }
      >
        <Link className="size-4" />
        Copy URL
      </ContextMenuItem>

      <ContextMenuItem
        onSelect={() => navigator.clipboard.writeText(task.title)}
      >
        <Copy className="size-4" />
        Copy Title
      </ContextMenuItem>
    </>
  );
}

export function RenameAction({ task }: Readonly<StaticMenuItemsProps>) {
  return (
    <ContextMenuItem onSelect={() => {/* open rename dialog */}}>
      <Pencil className="size-4" />
      Rename...
      <ContextMenuShortcut>&#8679;R</ContextMenuShortcut>
    </ContextMenuItem>
  );
}
```

**Key points:**
- No hooks, no data fetching — pure render + simple callbacks.
- `onSelect` fires when the user clicks or presses Enter on the item.
- `navigator.clipboard.writeText` is synchronous enough for menu handlers.

---

### Dynamic Menu Items — Priority Submenu

The priority submenu maps a static list of options against the task's current priority. No API fetch is needed — the options are a fixed enum.

```tsx
// priority-submenu.tsx
import {
  AlertOctagon,
  Signal,
  SignalHigh,
  SignalMedium,
  SquareEqual,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { ITask, Priority } from "@/types";

interface PriorityOption {
  value: Priority;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Module-level constant — never re-created.
const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  { value: "no_priority", label: "No priority", icon: SquareEqual, color: "text-[#94a3b8]" },
  { value: "urgent", label: "Urgent", icon: AlertOctagon, color: "text-red-600" },
  { value: "high", label: "High", icon: Signal, color: "text-orange-500" },
  { value: "medium", label: "Medium", icon: SignalHigh, color: "text-yellow-500" },
  { value: "low", label: "Low", icon: SignalMedium, color: "text-blue-400" },
];

interface PrioritySubmenuProps {
  task: ITask;
  onChangePriority: (task: ITask, priority: Priority) => void;
}

export function PrioritySubmenu({
  task,
  onChangePriority,
}: Readonly<PrioritySubmenuProps>) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Signal className="size-4" />
        Priority
        <ContextMenuShortcut>P</ContextMenuShortcut>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-44">
        {PRIORITY_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ContextMenuItem
              key={option.value}
              disabled={task.priority === option.value}
              onSelect={() => onChangePriority(task, option.value)}
            >
              <Icon className={cn("size-4", option.color)} />
              {option.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
```

**Key points:**
- `PRIORITY_OPTIONS` is hoisted to module scope (follows `rendering-hoist-jsx` and `rerender-memo-with-default-value` best practices).
- `disabled` on the current priority prevents a no-op mutation.
- The callback delegates to the parent — no mutation hook here.

---

### Dynamic Menu Items — Assignee Submenu (API-Driven)

The assignee submenu fetches user data and renders a multi-select list. This is the most complex submenu type because it requires:
1. Data fetching (user list from API)
2. Multi-select state (toggle assignees on/off)
3. Optimistic UI feedback (check marks for currently assigned users)

```tsx
// assignee-submenu.tsx
import { Check, UserPlus } from "lucide-react";

import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStoreUsersList } from "@/stores/use-store-users-list";
import { useGetUsers } from "@/components/AssigneeDropdown/hooks/use-get-users";
import type { ITask, TAssignee } from "@/types";

interface AssigneeSubmenuProps {
  task: ITask;
  onChangeAssignees: (task: ITask, assignees: TAssignee[]) => void;
}

export function AssigneeSubmenu({
  task,
  onChangeAssignees,
}: Readonly<AssigneeSubmenuProps>) {
  // Trigger fetch — data lands in Zustand store via the hook's onSuccess.
  useGetUsers();
  const users = useStoreUsersList((s) => s.users);

  const assignedIds = new Set(task.assignees.map((a) => a.id));

  const handleToggle = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const pick: TAssignee = {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    };

    const next = assignedIds.has(userId)
      ? task.assignees.filter((a) => a.id !== userId)
      : [...task.assignees, pick];

    onChangeAssignees(task, next);
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <UserPlus className="size-4" />
        Assignee
        <ContextMenuShortcut>A</ContextMenuShortcut>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-52">
        {users.map((user) => (
          <ContextMenuItem
            key={user.id}
            onSelect={(e) => {
              e.preventDefault(); // Keep submenu open for multi-select
              handleToggle(user.id);
            }}
          >
            <Avatar className="size-5">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {user.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{user.full_name}</span>
            {assignedIds.has(user.id) && (
              <Check className="ml-auto size-4 shrink-0" />
            )}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
```

**Key points:**
- `e.preventDefault()` in `onSelect` keeps the submenu open — essential for multi-select behavior.
- `useGetUsers()` is called inside the submenu. Because TanStack Query deduplicates requests and caches for 5 minutes (configured in `query-client.ts`), this won't cause redundant fetches.
- The `Set` for `assignedIds` is derived during render — no `useMemo` needed thanks to the React Compiler (`rerender-derived-state` best practice).
- Each toggle immediately calls `onChangeAssignees` with the full new array — the parent handles the mutation and optimistic store update.

---

### Dynamic Menu Items — Labels Submenu (API-Driven)

Follows the same pattern as the Assignee submenu:

```tsx
// labels-submenu.tsx
import { Check, Tag } from "lucide-react";

import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import type { ITask, ILabel } from "@/types";

interface LabelsSubmenuProps {
  task: ITask;
  availableLabels: ILabel[];
  onChangeLabels: (task: ITask, labels: ILabel[]) => void;
}

export function LabelsSubmenu({
  task,
  availableLabels,
  onChangeLabels,
}: Readonly<LabelsSubmenuProps>) {
  const selectedIds = new Set(task.labels.map((l) => l.id));

  const handleToggle = (label: ILabel) => {
    const next = selectedIds.has(label.id)
      ? task.labels.filter((l) => l.id !== label.id)
      : [...task.labels, label];

    onChangeLabels(task, next);
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Tag className="size-4" />
        Labels
        <ContextMenuShortcut>L</ContextMenuShortcut>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-48">
        {availableLabels.map((label) => (
          <ContextMenuItem
            key={label.id}
            onSelect={(e) => {
              e.preventDefault();
              handleToggle(label);
            }}
          >
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span className="truncate">{label.name}</span>
            {selectedIds.has(label.id) && (
              <Check className="ml-auto size-4 shrink-0" />
            )}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
```

---

## Handling Menu Actions

### Callback Pattern

The context menu exposes granular callbacks — one per action type. The parent (`Task.tsx`) maps these to the appropriate mutation hook.

```tsx
// types.ts — shared callback signatures
import type { ITask, ILabel, Priority, TAssignee } from "@/types";

export interface TaskContextMenuCallbacks {
  onChangePriority?: (task: ITask, priority: Priority) => void;
  onChangeAssignees?: (task: ITask, assignees: TAssignee[]) => void;
  onChangeLabels?: (task: ITask, labels: ILabel[]) => void;
  onMoveToColumn?: (task: ITask, columnId: number) => void;
  onRename?: (task: ITask) => void;
  onDelete?: (task: ITask) => void;
}
```

### Parent Integration (Task.tsx)

```tsx
// In Task.tsx — wire callbacks to mutation hooks
<TaskContextMenu
  task={{ ...task, priority: localPriority, column_id: columnId }}
  onChangePriority={(_task, priority) => handlePriorityChange(priority)}
  onChangeAssignees={(_task, assignees) => handleAssigneeChange(assignees)}
  onDelete={(_task) => handleDelete()}
>
  {/* task card */}
</TaskContextMenu>
```

### Mutation Flow

```
User selects "High" in Priority submenu
  → PrioritySubmenu calls onChangePriority(task, "high")
  → Task.tsx handlePriorityChange("high")
    → setLocalPriority("high")              // optimistic local state
    → updateTaskMutation({ id, task: { priority: "high" } })
      → PATCH /tasks/:id { priority: "high" }
      → onSuccess: invalidate ['board'] query
```

---

## Best Practices

### Performance

1. **Module-level constants** — `PRIORITY_OPTIONS` and other static config arrays are defined outside the component. No per-render allocations.

2. **React Compiler handles memoization** — this project has `babel-plugin-react-compiler` enabled. Do **not** add manual `useMemo`, `useCallback`, or `React.memo`. The compiler optimizes automatically.

3. **Derived state during render** — compute `assignedIds`, `selectedIds` (as `Set`) directly in the render path. No `useEffect` + `useState` pattern needed (`rerender-derived-state-no-effect` rule).

4. **TanStack Query deduplication** — calling `useGetUsers()` inside a submenu is safe. The query client deduplicates concurrent requests and serves from cache within the 5-minute stale window.

5. **Zustand selector granularity** — use targeted selectors like `useStoreKanbanBoard((s) => s.kanbanBoard)` to subscribe only to the slice you need. Avoid selecting the entire store object.

### Accessibility

1. **Radix handles keyboard navigation** — `ContextMenu` from Radix UI provides full keyboard support out of the box:
   - Arrow keys to navigate items
   - Enter/Space to select
   - Escape to close
   - Right arrow to open submenu, Left arrow to close

2. **`asChild` on ContextMenuTrigger** — the trigger merges onto the child element rather than wrapping in an extra `<span>`. This preserves the original element's semantics and `ref` (critical for drag-and-drop).

3. **Destructive variant** — `variant="destructive"` on the Delete item provides visual distinction (red text) and semantic clarity.

4. **`disabled` on current selection** — prevents no-op actions and communicates current state to screen readers.

### Scalability

1. **One file per submenu** — each submenu is a self-contained component. Adding a new submenu means creating one new file and adding one line in `index.tsx`.

2. **Shared callback interface** — `TaskContextMenuCallbacks` type in `types.ts` ensures all action signatures are consistent. New actions extend this interface.

3. **Static items are trivially composable** — group related static items into small components (`CopyActions`, `RenameAction`) and compose them in the main menu.

4. **Submenu components own their data** — dynamic submenus call their own query hooks. The parent doesn't need to know what data each submenu requires. This keeps the parent component lean as menu features grow.

5. **Module-scope option arrays** — adding a new priority level or status option is a single line in the constant array. No component logic changes required.
