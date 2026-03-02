# Task Detail Page — Technical Document

## Overview

A task detail view that works in **two modes**:

1. **Full page** — navigated via URL `/projects/$projectId/tasks/$taskId`
2. **Modal** — opened from the kanban board (clicking a task card), renders the same content inside a shadcn Dialog/Sheet

Both modes share a single `<TaskDetail />` component. The page route wraps it in layout; the modal wraps it in a dialog.

---

## Design Breakdown

### Top Bar

- Breadcrumb: `Projects > {projectName} > {ticketId}`
- "Back to Board" link (page mode only — modal uses dialog close)
- Action icons: copy link, pin, more menu (`...`)

### Main Content (left)

| Section | Details |
|---------|---------|
| **Header** | Status checkbox + task title (editable h1), ticket ID badge, "Created by {user} on {date}" |
| **Description** | Rich text block (read/edit toggle). Supports paragraphs and bullet lists |
| **Subtasks** | Progress counter (`1/3 Completed`), checkbox list with assignee avatar, `+ Add subtask` button |
| **Tabs** | `Comments` (with count badge), `History` (active by default), `Time Log` |
| **Activity Log** | Grouped by date (`TODAY`, `YESTERDAY`). Filter dropdown. Activity types: status change, estimate update, subtask completion, comment, assignment, label change, priority change, description update |

### Sidebar (right)

| Card | Fields |
|------|--------|
| **Properties** | Status (dropdown), Assignee (dropdown), Priority (dropdown), Due Date (date picker), Estimate (points input) |
| **Attachments** | File list — type badge (PDF/DOC), filename, size, added date, download button. `+` add button |
| **Tags** | Colored tag badges, `+ Add` button |

---

## File Structure

```
src/
├── features/
│   └── TaskDetail/
│       ├── index.tsx                    # <TaskDetail /> — shared content component
│       ├── task-detail-header.tsx       # Title, ticket ID, created by, action icons
│       ├── task-detail-description.tsx  # Description section (read/edit)
│       ├── task-detail-subtasks.tsx     # Subtasks list + add subtask
│       ├── task-detail-sidebar.tsx      # Properties, Attachments, Tags cards
│       ├── task-detail-activity.tsx     # Activity log list
│       ├── task-detail-tabs.tsx         # Comments | History | Time Log tab nav
│       └── hooks/
│           ├── use-get-task.ts          # TanStack Query — fetch single task
│           ├── use-get-subtasks.ts      # TanStack Query — fetch subtasks
│           ├── use-get-activity-log.ts  # TanStack Query — fetch activity log
│           ├── use-create-subtask.ts    # Mutation — add subtask
│           └── use-toggle-subtask.ts    # Mutation — toggle subtask completion
├── components/
│   └── Modals/
│       └── task-detail-modal.tsx        # Dialog wrapper for modal mode
├── routes/
│   └── _authenticated/
│       └── projects/
│           └── $projectId/
│               └── tasks/
│                   └── $taskId.tsx      # Route file — full page mode
├── services/
│   └── task.service.ts                  # Add getTask(), getSubtasks(), getActivityLog(), etc.
└── types/
    ├── task.type.ts                     # Extend with subtask, activity, attachment types
    └── index.ts                         # Re-export new types
```

---

## Types

Extend `src/types/task.type.ts` with the following (existing types remain unchanged):

```ts
// --- Subtask ---

interface ISubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assignee: TAssignee | null;
  created_at: string;
  updated_at: string;
}

// --- Activity Log ---

type ActivityAction =
  | "status_changed"
  | "priority_changed"
  | "estimate_changed"
  | "assignee_changed"
  | "label_added"
  | "label_removed"
  | "subtask_completed"
  | "comment_added"
  | "description_updated";

interface IActivity {
  id: string;
  task_id: string;
  user: TAssignee;
  action: ActivityAction;
  /** Stringified old/new values or comment text — shape depends on action */
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- Attachment ---

type AttachmentFileType = "pdf" | "doc" | "docx" | "xls" | "xlsx" | "png" | "jpg" | "other";

interface IAttachment {
  id: string;
  task_id: string;
  filename: string;
  file_type: AttachmentFileType;
  file_size: number;         // bytes
  download_url: string;
  created_at: string;
}

// --- Extended Task (full detail) ---

interface ITaskDetail extends ITask {
  creator: TAssignee;
  due_date: string | null;
  estimate: number | null;
  subtasks: ISubtask[];
  attachments: IAttachment[];
  tags: ILabel[];
  comment_count: number;
}
```

---

## API Endpoints

Add to `src/services/task.service.ts`:

| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `getTask(id)` | GET | `/tasks/:id` | Returns `ITaskDetail` |
| `getActivityLog(taskId, params?)` | GET | `/tasks/:id/activities` | Paginated, returns `IActivity[]` |
| `createSubtask(taskId, title)` | POST | `/tasks/:id/subtasks` | Returns `ISubtask` |
| `toggleSubtask(subtaskId)` | PATCH | `/subtasks/:id/toggle` | Returns `ISubtask` |
| `addAttachment(taskId, file)` | POST | `/tasks/:id/attachments` | Multipart form data |
| `addTag(taskId, tagId)` | POST | `/tasks/:id/tags` | — |
| `removeTag(taskId, tagId)` | DELETE | `/tasks/:id/tags/:tagId` | — |
| `updateTask(id, partial)` | PATCH | `/tasks/:id` | Already exists — reuse for due_date, estimate, description, title |

---

## Query Hooks

### `use-get-task.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { getTask } from "@/services/task.service";

export const useGetTask = (taskId: string) => {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
  });
};
```

### `use-get-activity-log.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { getActivityLog } from "@/services/task.service";

export const useGetActivityLog = (taskId: string) => {
  return useQuery({
    queryKey: ["task", taskId, "activities"],
    queryFn: () => getActivityLog(taskId),
    enabled: !!taskId,
  });
};
```

Mutation hooks (`use-create-subtask.ts`, `use-toggle-subtask.ts`) follow the same pattern as the existing `use-update-task.ts` — call the service, invalidate `["task", taskId]` on success.

---

## Routing

### Full Page Route

Create `src/routes/_authenticated/projects/$projectId/tasks/$taskId.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import TaskDetailPage from "@/features/TaskDetail";

export const Route = createFileRoute(
  "/_authenticated/projects/$projectId/tasks/$taskId"
)({
  component: TaskDetailPage,
});
```

The component reads params via `const { taskId, projectId } = Route.useParams()`.

### Modal Mode (from Kanban Board)

In `src/features/KanbanBoard/task.tsx`, clicking a task card opens the modal:

```tsx
const [detailOpen, setDetailOpen] = useState(false);

// On click (not right-click):
<div onClick={() => setDetailOpen(true)}>
  {/* existing task card content */}
</div>

{detailOpen && (
  <TaskDetailModal
    taskId={task.id}
    open={detailOpen}
    onOpenChange={setDetailOpen}
  />
)}
```

---

## Component Design

### `<TaskDetail />` — shared content

```
+---------------------------------------------------------------+
| Breadcrumb              [copy link] [pin] [...]               |
+---------------------------------------------------------------+
|                                          |                    |
|  ○ API Integration for Dashboard         | PROPERTIES         |
|  FLW-102  Created by Sarah Jenkins       |  Status            |
|                                          |  Assignee          |
|  Description                             |  Priority          |
|  ┌────────────────────────────┐          |  Due Date          |
|  │ Rich text content...       │          |  Estimate          |
|  └────────────────────────────┘          |                    |
|                                          | ATTACHMENTS        |
|  Subtasks              1/3 Completed     |  file list...      |
|  ┌────────────────────────────┐          |                    |
|  │ ✅ Finalize API Schema     │          | TAGS               |
|  │ ○  Implement Data Fetch    │          |  Backend  Sprint12 |
|  │ ○  Add Loading States      │          |                    |
|  └────────────────────────────┘          |                    |
|  + Add subtask                           |                    |
|                                          |                    |
|  Comments 4 | History | Time Log         |                    |
|  ─────────────────────────────           |                    |
|  Activity Log              [Filter v]    |                    |
|  TODAY                                   |                    |
|  ● Alex Chen changed status from...     |                    |
|  ...                                     |                    |
+---------------------------------------------------------------+
```

**Layout:** CSS Grid — `grid-cols-[1fr_320px]` on desktop, single column on mobile.

**Props:**

```ts
interface TaskDetailProps {
  taskId: string;
  /** Show breadcrumb + back link (page mode) vs. hide them (modal mode) */
  mode: "page" | "modal";
}
```

### `<TaskDetailModal />`

Wraps `<TaskDetail mode="modal" />` inside a shadcn `Dialog` (or `Sheet` side-panel). Uses `DialogContent` with a wide max-width (`sm:max-w-4xl`). No default close button — close via Esc or the dialog overlay.

---

## shadcn Components to Install

```bash
pnpm dlx shadcn@latest add tabs badge select popover calendar textarea scroll-area separator sheet tooltip
```

| Component | Used For |
|-----------|----------|
| `Tabs` | Comments / History / Time Log |
| `Badge` | Ticket ID, tag badges, file type badges |
| `Select` | Status, Priority, Estimate dropdowns in sidebar |
| `Popover` + `Calendar` | Due Date picker |
| `Textarea` | Description editing, comment input |
| `ScrollArea` | Activity log scrolling |
| `Separator` | Section dividers |
| `Sheet` | Alternative to Dialog for modal mode (side-panel feel) |
| `Tooltip` | Action icon tooltips |

Already installed: `Dialog`, `Input`, `Button`, `Avatar`, `Checkbox`, `DropdownMenu`, `Label`.

---

## Implementation Phases

### Phase 1 — Core Layout & Data Fetching

1. Add new types (`ITaskDetail`, `ISubtask`, `IActivity`, `IAttachment`) to `src/types/task.type.ts`
2. Add `getTask()` and `getActivityLog()` to `src/services/task.service.ts`
3. Create `use-get-task.ts` hook
4. Scaffold `<TaskDetail />` with header + two-column grid layout
5. Create the route file at `src/routes/_authenticated/projects/$projectId/tasks/$taskId.tsx`
6. Verify navigation works end-to-end

### Phase 2 — Sidebar Properties

1. Install shadcn `Select`, `Popover`, `Calendar`, `Badge`, `Separator`
2. Build `<TaskDetailSidebar />` with Properties card
3. Reuse existing `<AssigneeDropdown />` and `<PriorityDropdown />`
4. Add due date picker and estimate input
5. Wire up `useUpdateTask` mutation for each field change (optimistic updates)

### Phase 3 — Description & Subtasks

1. Install shadcn `Textarea`, `Checkbox`
2. Build `<TaskDetailDescription />` with read/edit toggle
3. Build `<TaskDetailSubtasks />` — checkbox list, progress counter, add form
4. Add `createSubtask()`, `toggleSubtask()` services + mutation hooks

### Phase 4 — Activity Log & Tabs

1. Install shadcn `Tabs`, `ScrollArea`
2. Build `<TaskDetailTabs />` tab navigation
3. Build `<TaskDetailActivity />` — grouped by date, per-action-type rendering
4. Add `getActivityLog()` service + query hook
5. Add filter dropdown for activity types

### Phase 5 — Attachments, Tags & Modal Mode

1. Build Attachments card — file list, type badge, download link
2. Build Tags card — badge list, `+ Add` popover
3. Build `<TaskDetailModal />` using shadcn Sheet or Dialog
4. Wire modal open from kanban board task card click
5. Test both page and modal modes

### Phase 6 — Comments & Time Log (future)

These tabs are visible but can show "Coming soon" placeholder. Implement when backend endpoints are ready.

---

## Key Patterns to Follow

- **Optimistic updates**: Update Zustand store first, then fire mutation (same as `PrioritySubmenu`)
- **`import type`**: Required due to `verbatimModuleSyntax`
- **No manual memoization**: React Compiler handles it
- **shadcn/ui first**: Use shadcn components over plain HTML
- **Service → Hook → Component**: Never call `httpClient` directly from components
- **Query key conventions**: `["task", taskId]` for detail, `["task", taskId, "activities"]` for activity log, `["board"]` for the kanban board
- **Conditional rendering for modals**: Unmount when closed to reset state (same as `RenameTaskModal`)
