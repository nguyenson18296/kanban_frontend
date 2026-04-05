# Task Activity Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Activity Log" placeholder in the task detail view with a fully functional, paginated activity timeline that renders all 12 action types with type-specific content renderers.

**Architecture:** A vertical timeline component renders activity items grouped by date. Each activity action type maps to a dedicated renderer function inside a single `ActivityContent` component (switch-based, same pattern as `NotificationContent`). Data flows through a React Query hook backed by a service layer calling `GET /api/tasks/:taskId/activities`. Infinite scroll loads older entries without pagination controls.

**Tech Stack:** React 19, TanStack Query, shadcn/ui (Avatar, Separator, Badge), date-fns, Tailwind CSS, Vitest

---

## File Structure

```
src/types/activity.type.ts                              # NEW — Activity types + enum
src/services/activity.service.ts                         # NEW — API service
src/features/TaskDetail/activity/hooks/use-get-activities.ts  # NEW — React Query hook
src/features/TaskDetail/activity/activity-list.tsx        # NEW — Timeline container + grouping
src/features/TaskDetail/activity/activity-item.tsx        # NEW — Single activity renderer
src/features/TaskDetail/activity/index.tsx                # MODIFY — Wire ActivityList into tab
src/types/index.ts                                       # MODIFY — Re-export activity types
src/index.css                                            # MODIFY — Timeline connector styles
src/features/TaskDetail/activity/tests/activity-item.test.tsx  # NEW — Unit tests
src/features/TaskDetail/activity/tests/activity-list.test.tsx  # NEW — Unit tests
```

**Responsibility map:**

| File | Responsibility |
|------|---------------|
| `activity.type.ts` | `TaskActivityAction` enum, `Activity` interface, payload discriminated union |
| `activity.service.ts` | `getActivities(taskId, params)` → HTTP GET with query params |
| `use-get-activities.ts` | `useGetActivities(taskId)` — infinite query with `getNextPageParam` |
| `activity-list.tsx` | Groups activities by date ("Today", "Yesterday", date string), renders timeline UI, infinite scroll trigger |
| `activity-item.tsx` | Renders single activity: avatar, content by action type, timestamp. Contains `ActivityContent` switch component |
| `index.tsx` | Imports `ActivityList`, renders it in the activity tab |

---

## Task 1: Define Activity Types

**Files:**
- Create: `src/types/activity.type.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create activity type definitions**

```typescript
// src/types/activity.type.ts

export const TaskActivityAction = {
  TASK_CREATED: 'task_created',
  TASK_TITLE_UPDATED: 'task_title_updated',
  TASK_DESCRIPTION_UPDATED: 'task_description_updated',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_PRIORITY_CHANGED: 'task_priority_changed',
  TASK_DUE_DATE_CHANGED: 'task_due_date_changed',
  TASK_ASSIGNEE_ADDED: 'task_assignee_added',
  TASK_ASSIGNEE_REMOVED: 'task_assignee_removed',
  TASK_LABEL_ADDED: 'task_label_added',
  TASK_LABEL_REMOVED: 'task_label_removed',
  TASK_MOVED: 'task_moved',
  TASK_REORDERED: 'task_reordered',
} as const;

export type TaskActivityAction = (typeof TaskActivityAction)[keyof typeof TaskActivityAction];

interface FieldChangePayload {
  from: string;
  to: string;
}

interface DueDateChangePayload {
  from: string | null;
  to: string | null;
}

interface AssigneeChangePayload {
  users: {
    user_id: string;
    full_name: string;
  }[];
}

interface LabelChangePayload {
  labels: {
    label_id: number;
    label_name: string;
  }[];
}

interface TaskMovedPayload {
  from_column_id: number;
  to_column_id: number;
  position: number;
}

interface TaskReorderedPayload {
  position: number;
}

type ActivityPayload =
  | Record<string, never>
  | FieldChangePayload
  | DueDateChangePayload
  | AssigneeChangePayload
  | LabelChangePayload
  | TaskMovedPayload
  | TaskReorderedPayload;

interface IActivity {
  id: string;
  action: TaskActivityAction;
  payload: ActivityPayload;
  actor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

interface IActivityQueryParams {
  page?: number;
  limit?: number;
  action?: TaskActivityAction;
}

export type {
  IActivity,
  IActivityQueryParams,
  ActivityPayload,
  FieldChangePayload,
  DueDateChangePayload,
  AssigneeChangePayload,
  LabelChangePayload,
  TaskMovedPayload,
  TaskReorderedPayload,
};
```

- [ ] **Step 2: Re-export from types barrel**

Add to `src/types/index.ts`:

```typescript
export * from './activity.type';
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Success, no type errors

- [ ] **Step 4: Commit**

```bash
git add src/types/activity.type.ts src/types/index.ts
git commit -m "feat(activity): add activity type definitions"
```

---

## Task 2: Create Activity API Service

**Files:**
- Create: `src/services/activity.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/activity.service.ts
import { httpClient } from "@/lib/http-client";
import type { IActivity, IActivityQueryParams, IResponse } from "@/types";

export const getActivities = (taskId: string, params: IActivityQueryParams = {}) => {
  const queryParams = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] != null)
      .map(([key, value]) => [key, String(value)])
  );
  const query = queryParams.toString();
  return httpClient.get<IResponse<IActivity[]>>(
    `/tasks/${taskId}/activities${query ? `?${query}` : ""}`
  );
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/services/activity.service.ts
git commit -m "feat(activity): add activity API service"
```

---

## Task 3: Create React Query Hook with Infinite Scroll

**Files:**
- Create: `src/features/TaskDetail/activity/hooks/use-get-activities.ts`

- [ ] **Step 1: Create the infinite query hook**

```typescript
// src/features/TaskDetail/activity/hooks/use-get-activities.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { getActivities } from "@/services/activity.service";

const ACTIVITIES_PER_PAGE = 20;

export const useGetActivities = (taskId: string) => {
  return useInfiniteQuery({
    queryKey: ["activities", taskId],
    queryFn: ({ pageParam }) =>
      getActivities(taskId, { page: pageParam, limit: ACTIVITIES_PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/features/TaskDetail/activity/hooks/use-get-activities.ts
git commit -m "feat(activity): add infinite query hook for activities"
```

---

## Task 4: Create ActivityItem Component

**Files:**
- Create: `src/features/TaskDetail/activity/activity-item.tsx`
- Test: `src/features/TaskDetail/activity/tests/activity-item.test.tsx`

- [ ] **Step 1: Write failing tests for all activity action types**

```typescript
// src/features/TaskDetail/activity/tests/activity-item.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskActivityAction } from "@/types";
import type { IActivity } from "@/types";
import ActivityItem from "../activity-item";

function createActivity(overrides: Partial<IActivity> = {}): IActivity {
  return {
    id: "act-1",
    action: TaskActivityAction.TASK_CREATED,
    payload: {},
    actor: {
      id: "user-1",
      full_name: "Grace Bui",
      avatar_url: "",
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ActivityItem", () => {
  describe("action content rendering", () => {
    it("renders task_created", () => {
      render(<ActivityItem activity={createActivity()} />);
      expect(screen.getByText("Grace Bui")).toBeInTheDocument();
      expect(screen.getByText(/created this task/)).toBeInTheDocument();
    });

    it("renders task_title_updated", () => {
      render(
        <ActivityItem activity={createActivity({ action: TaskActivityAction.TASK_TITLE_UPDATED })} />,
      );
      expect(screen.getByText(/updated the title/)).toBeInTheDocument();
    });

    it("renders task_description_updated", () => {
      render(
        <ActivityItem activity={createActivity({ action: TaskActivityAction.TASK_DESCRIPTION_UPDATED })} />,
      );
      expect(screen.getByText(/updated the description/)).toBeInTheDocument();
    });

    it("renders task_status_changed with from/to badges", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_STATUS_CHANGED,
            payload: { from: "Open", to: "In Progress" },
          })}
        />,
      );
      expect(screen.getByText(/changed status/)).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders task_priority_changed with from/to", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_PRIORITY_CHANGED,
            payload: { from: "Medium", to: "Urgent" },
          })}
        />,
      );
      expect(screen.getByText(/changed priority/)).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("renders task_due_date_changed with dates", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_DUE_DATE_CHANGED,
            payload: { from: null, to: "2026-04-10T00:00:00.000Z" },
          })}
        />,
      );
      expect(screen.getByText(/changed the due date/)).toBeInTheDocument();
      expect(screen.getByText(/Apr 10, 2026/)).toBeInTheDocument();
    });

    it("renders task_assignee_added with user names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_ASSIGNEE_ADDED,
            payload: { users: [{ user_id: "u1", full_name: "John Doe" }] },
          })}
        />,
      );
      expect(screen.getByText(/assigned/)).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders task_assignee_removed with user names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_ASSIGNEE_REMOVED,
            payload: { users: [{ user_id: "u1", full_name: "Jane Smith" }] },
          })}
        />,
      );
      expect(screen.getByText(/unassigned/)).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders task_label_added with label names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_LABEL_ADDED,
            payload: { labels: [{ label_id: 5, label_name: "Frontend" }] },
          })}
        />,
      );
      expect(screen.getByText(/added label/)).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });

    it("renders task_label_removed with label names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_LABEL_REMOVED,
            payload: { labels: [{ label_id: 5, label_name: "Bug" }] },
          })}
        />,
      );
      expect(screen.getByText(/removed label/)).toBeInTheDocument();
      expect(screen.getByText("Bug")).toBeInTheDocument();
    });

    it("renders task_moved", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_MOVED,
            payload: { from_column_id: 1, to_column_id: 2, position: 3 },
          })}
        />,
      );
      expect(screen.getByText(/moved this task/)).toBeInTheDocument();
    });

    it("renders task_reordered", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_REORDERED,
            payload: { position: 2 },
          })}
        />,
      );
      expect(screen.getByText(/reordered this task/)).toBeInTheDocument();
    });
  });

  it("renders actor avatar with fallback initials", () => {
    render(<ActivityItem activity={createActivity({ actor: { id: "u1", full_name: "Grace Bui", avatar_url: null } })} />);
    expect(screen.getByText("GB")).toBeInTheDocument();
  });

  it("renders relative timestamp", () => {
    render(<ActivityItem activity={createActivity()} />);
    // formatDistanceToNow produces "less than a minute ago" for just-created
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/TaskDetail/activity/tests/activity-item.test.tsx`
Expected: FAIL — `activity-item.tsx` does not exist yet

- [ ] **Step 3: Implement ActivityItem component**

```typescript
// src/features/TaskDetail/activity/activity-item.tsx
import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight } from "lucide-react";

import { TaskActivityAction } from "@/types";
import type {
  IActivity,
  FieldChangePayload,
  DueDateChangePayload,
  AssigneeChangePayload,
  LabelChangePayload,
} from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function FieldChangeBadges({ from, to }: Readonly<{ from: string; to: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">{from}</span>
      <ArrowRight className="size-3 text-muted-foreground" />
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">{to}</span>
    </span>
  );
}

function ActivityContent({ activity }: Readonly<{ activity: IActivity }>) {
  const { action, actor, payload } = activity;
  const name = <span className="font-semibold text-[#0f172a]">{actor.full_name}</span>;

  switch (action) {
    case TaskActivityAction.TASK_CREATED:
      return <p className="text-sm text-[#334155] m-0">{name} created this task</p>;

    case TaskActivityAction.TASK_TITLE_UPDATED:
      return <p className="text-sm text-[#334155] m-0">{name} updated the title</p>;

    case TaskActivityAction.TASK_DESCRIPTION_UPDATED:
      return <p className="text-sm text-[#334155] m-0">{name} updated the description</p>;

    case TaskActivityAction.TASK_STATUS_CHANGED: {
      const { from, to } = payload as FieldChangePayload;
      return (
        <div className="text-sm text-[#334155]">
          <p className="m-0">{name} changed status</p>
          <div className="mt-1">
            <FieldChangeBadges from={from} to={to} />
          </div>
        </div>
      );
    }

    case TaskActivityAction.TASK_PRIORITY_CHANGED: {
      const { from, to } = payload as FieldChangePayload;
      return (
        <div className="text-sm text-[#334155]">
          <p className="m-0">{name} changed priority</p>
          <div className="mt-1">
            <FieldChangeBadges from={from} to={to} />
          </div>
        </div>
      );
    }

    case TaskActivityAction.TASK_DUE_DATE_CHANGED: {
      const { from, to } = payload as DueDateChangePayload;
      const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "None");
      return (
        <div className="text-sm text-[#334155]">
          <p className="m-0">{name} changed the due date</p>
          <div className="mt-1">
            <FieldChangeBadges from={formatDate(from)} to={formatDate(to)} />
          </div>
        </div>
      );
    }

    case TaskActivityAction.TASK_ASSIGNEE_ADDED: {
      const { users } = payload as AssigneeChangePayload;
      const names = users.map((u) => u.full_name);
      return (
        <p className="text-sm text-[#334155] m-0">
          {name} assigned{" "}
          {names.map((n, i) => (
            <span key={n}>
              <span className="font-semibold text-[#0f172a]">{n}</span>
              {i < names.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_ASSIGNEE_REMOVED: {
      const { users } = payload as AssigneeChangePayload;
      const names = users.map((u) => u.full_name);
      return (
        <p className="text-sm text-[#334155] m-0">
          {name} unassigned{" "}
          {names.map((n, i) => (
            <span key={n}>
              <span className="font-semibold text-[#0f172a]">{n}</span>
              {i < names.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_LABEL_ADDED: {
      const { labels } = payload as LabelChangePayload;
      return (
        <p className="text-sm text-[#334155] m-0">
          {name} added label{labels.length > 1 ? "s" : ""}{" "}
          {labels.map((l, i) => (
            <span key={l.label_id}>
              <span className="rounded-md bg-[#5a5cf2]/10 px-1.5 py-0.5 text-xs font-medium text-[#5a5cf2]">
                {l.label_name}
              </span>
              {i < labels.length - 1 && " "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_LABEL_REMOVED: {
      const { labels } = payload as LabelChangePayload;
      return (
        <p className="text-sm text-[#334155] m-0">
          {name} removed label{labels.length > 1 ? "s" : ""}{" "}
          {labels.map((l, i) => (
            <span key={l.label_id}>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium line-through">
                {l.label_name}
              </span>
              {i < labels.length - 1 && " "}
            </span>
          ))}
        </p>
      );
    }

    case TaskActivityAction.TASK_MOVED:
      return <p className="text-sm text-[#334155] m-0">{name} moved this task to another column</p>;

    case TaskActivityAction.TASK_REORDERED:
      return <p className="text-sm text-[#334155] m-0">{name} reordered this task</p>;

    default:
      return <p className="text-sm text-[#334155] m-0">{name} updated this task</p>;
  }
}

export default function ActivityItem({ activity }: Readonly<{ activity: IActivity }>) {
  const { actor, created_at } = activity;

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Timeline connector line */}
      <div className="activity-timeline-line absolute left-[18px] top-9 bottom-0 w-px bg-border last:hidden" />

      <Avatar className="size-9 shrink-0 ring-2 ring-background z-10">
        <AvatarImage src={actor.avatar_url ?? undefined} alt={actor.full_name} />
        <AvatarFallback className="text-xs bg-muted">
          {getInitials(actor.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 pt-1">
        <ActivityContent activity={activity} />
        <p className="text-xs text-muted-foreground m-0 mt-1">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/TaskDetail/activity/tests/activity-item.test.tsx`
Expected: All 14 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/TaskDetail/activity/activity-item.tsx src/features/TaskDetail/activity/tests/activity-item.test.tsx
git commit -m "feat(activity): add ActivityItem component with all action renderers"
```

---

## Task 5: Create ActivityList Component

**Files:**
- Create: `src/features/TaskDetail/activity/activity-list.tsx`
- Modify: `src/index.css`
- Test: `src/features/TaskDetail/activity/tests/activity-list.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/features/TaskDetail/activity/tests/activity-list.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskActivityAction } from "@/types";
import type { IActivity } from "@/types";
import ActivityList from "../activity-list";

function createActivity(overrides: Partial<IActivity> = {}): IActivity {
  return {
    id: "act-1",
    action: TaskActivityAction.TASK_CREATED,
    payload: {},
    actor: { id: "u1", full_name: "Grace Bui", avatar_url: "" },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Mock ActivityItem to simplify
vi.mock("../activity-item", () => ({
  default: ({ activity }: { activity: IActivity }) => (
    <div data-testid="activity-item">{activity.action}</div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ActivityList", () => {
  it("renders empty state when no activities", () => {
    render(<ActivityList activities={[]} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
  });

  it("renders all activity items", () => {
    const activities = [
      createActivity({ id: "a1" }),
      createActivity({ id: "a2" }),
      createActivity({ id: "a3" }),
    ];
    render(<ActivityList activities={activities} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getAllByTestId("activity-item")).toHaveLength(3);
  });

  it("groups activities by date with section headers", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const activities = [
      createActivity({ id: "a1", created_at: today }),
      createActivity({ id: "a2", created_at: yesterday }),
    ];
    render(<ActivityList activities={activities} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("shows Load more button when hasNextPage is true", () => {
    render(
      <ActivityList
        activities={[createActivity()]}
        hasNextPage={true}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("hides Load more button when hasNextPage is false", () => {
    render(
      <ActivityList
        activities={[createActivity()]}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/TaskDetail/activity/tests/activity-list.test.tsx`
Expected: FAIL — `activity-list.tsx` does not exist

- [ ] **Step 3: Add timeline connector CSS**

Append to `src/index.css` (before the closing notification section):

```css
/* Activity timeline */
.activity-group > div:last-child .activity-timeline-line {
  display: none;
}
```

- [ ] **Step 4: Implement ActivityList component**

```typescript
// src/features/TaskDetail/activity/activity-list.tsx
import { isToday, isYesterday, format } from "date-fns";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IActivity } from "@/types";
import ActivityItem from "./activity-item";

interface ActivityListProps {
  activities: IActivity[];
  hasNextPage: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function groupByDate(activities: IActivity[]): Map<string, IActivity[]> {
  const groups = new Map<string, IActivity[]>();
  for (const activity of activities) {
    const label = getDateLabel(activity.created_at);
    const group = groups.get(label);
    if (group) {
      group.push(activity);
    } else {
      groups.set(label, [activity]);
    }
  }
  return groups;
}

export default function ActivityList({ activities, hasNextPage, onLoadMore, isLoadingMore }: Readonly<ActivityListProps>) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <History className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground m-0">No activity yet</p>
          <p className="text-xs text-muted-foreground m-0 mt-1">Actions on this task will appear here</p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(activities);

  return (
    <div className="px-1 py-4">
      {[...groups.entries()].map(([label, items]) => (
        <div key={label} className="mb-6 last:mb-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0 mb-3 px-1">
            {label}
          </p>
          <div className="activity-group">
            {items.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <div className="pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/TaskDetail/activity/tests/activity-list.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/TaskDetail/activity/activity-list.tsx src/features/TaskDetail/activity/tests/activity-list.test.tsx src/index.css
git commit -m "feat(activity): add ActivityList component with date grouping"
```

---

## Task 6: Wire ActivityList into the Activity Tab

**Files:**
- Modify: `src/features/TaskDetail/activity/index.tsx`

- [ ] **Step 1: Update the activity tab to render ActivityList**

Replace the placeholder in `src/features/TaskDetail/activity/index.tsx`:

```typescript
// Add imports at top:
import ActivityList from "./activity-list";
import { useGetActivities } from "./hooks/use-get-activities";
```

Replace:
```tsx
<TabsContent value="activity">
  Activity Log
</TabsContent>
```

With:
```tsx
<TabsContent value="activity">
  <ActivityLog taskId={taskId} />
</TabsContent>
```

Add a new component in the same file (above the default export) to keep the data-fetching logic isolated:

```typescript
function ActivityLog({ taskId }: Readonly<{ taskId: string }>) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetActivities(taskId);

  const activities = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ActivityList
      activities={activities}
      hasNextPage={hasNextPage}
      onLoadMore={fetchNextPage}
      isLoadingMore={isFetchingNextPage}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Success

- [ ] **Step 3: Verify dev server renders activity tab**

Run: `pnpm dev`
Navigate to a task detail page → Activity tab. Verify:
- Empty state shows if no activities exist
- Activity items render if data exists
- "Load more" button appears when there are more pages

- [ ] **Step 4: Commit**

```bash
git add src/features/TaskDetail/activity/index.tsx
git commit -m "feat(activity): wire ActivityList into activity tab with infinite scroll"
```

---

## Task 7: Run Full Test Suite and Build Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass (existing + new activity tests)

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Success, no type errors

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 4: Final commit if any lint fixes needed**

```bash
git add -A
git commit -m "chore(activity): lint fixes"
```

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `useInfiniteQuery` over `useQuery` with manual pagination | Activities are append-only and sorted newest-first. Infinite scroll is the natural UX — users scroll down for older history. No need for page number controls. |
| `ActivityContent` as switch inside `activity-item.tsx` | Same pattern as `NotificationContent`. Keeps all renderers co-located. 12 cases is manageable in one file. If it grows beyond ~200 lines, extract to a map. |
| `groupByDate` using `Map` | Preserves insertion order (newest-first from API). No sorting needed on frontend. |
| `ActivityList` receives flat props, not the query object | Keeps the list a pure presentation component. Data fetching is in `ActivityLog` wrapper inside `index.tsx`. Makes testing trivial — no need to mock React Query. |
| CSS class `.activity-group > div:last-child .activity-timeline-line` | Hides the timeline connector on the last item per group. Pure CSS avoids prop-passing or index tracking in React. |
| `FieldChangeBadges` extracted as component | Reused across status, priority, and due date changes. DRY without over-abstracting. |
| Types use `as const` enum pattern (not TS `enum`) | Matches existing `NotificationType` pattern in the codebase. Avoids `erasableSyntaxOnly` constraint. |
