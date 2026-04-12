# KAN-70: Task Activity Log — Playwright E2E Test Plan

## Prerequisites

- App running at `http://localhost:5173`
- Authenticated user session (logged in)
- At least one project with tasks that have existing activity history
- Know a `projectId` and `taskId` (ticket ID like `KAN-6`) for navigation

---

## Test Suite 1: Activity Tab Rendering

### Test 1.1: Activity tab is visible and clickable

**Steps:**
1. Navigate to `http://localhost:5173/projects/{projectId}/tasks/{taskId}`
2. Scroll down to the tabs section (below subtasks)
3. Verify tab with text "Activity" is visible
4. Verify tab with text "Comments" is visible
5. Click the "Activity" tab

**Expected:**
- The "Activity" tab becomes active (has active/selected styling)
- The activity content area is visible below the tabs

---

### Test 1.2: Activity list renders with date-grouped sections

**Steps:**
1. Navigate to a task detail page that has existing activities
2. Click the "Activity" tab
3. Wait for the activity list to load

**Expected:**
- Date section headers are visible (e.g., "TODAY", "YESTERDAY", or a formatted date like "April 4, 2026")
- Section headers have indigo-colored uppercase text
- Multiple activity items render under their respective date groups

---

### Test 1.3: Empty state displays when no activities exist

**Steps:**
1. Navigate to a task that has no activity history (newly created task or create a new one)
2. Click the "Activity" tab

**Expected:**
- An icon and text "No activity yet" is visible
- Subtext "Actions on this task will appear here" is visible
- No activity items or date headers render

---

### Test 1.4: Activity items have color-coded icons

**Steps:**
1. Navigate to a task with various activity types
2. Click the "Activity" tab
3. Inspect the activity items visually

**Expected:**
- Each activity item has a colored circular icon on the left (the timeline node)
- Different action types have different colors (e.g., emerald for created, indigo for status change, rose for priority)
- Each item shows an actor avatar next to the content
- Each item shows a relative timestamp on the right (e.g., "2 hours ago")

---

## Test Suite 2: Activity Content by Action Type

### Test 2.1: Status change activity

**Steps:**
1. Navigate to task detail → Activity tab
2. Find an activity for status change (or trigger one via sidebar — see Suite 4)

**Expected:**
- Text: "{actor name} changed status from"
- Two badges visible: the "from" status and "to" status
- The "to" badge has indigo styling
- An arrow icon between the two badges

---

### Test 2.2: Priority change activity

**Steps:**
1. Find/trigger a priority change activity

**Expected:**
- Text: "{actor name} changed priority from"
- Two color-coded badges: "from" and "to" priorities
- Badge colors match priority levels (red=urgent, orange=high, yellow=medium, blue=low)

---

### Test 2.3: Assignee added/removed activity

**Steps:**
1. Find/trigger an assignee change activity

**Expected:**
- For added: "{actor name} assigned this to {user name}"
- For removed: "{actor name} unassigned {user name}"
- User names are bold

---

### Test 2.4: Label added/removed activity

**Steps:**
1. Find/trigger a label change activity

**Expected:**
- For added: "{actor name} added label {label badge}"
- Label badge uses the label's actual color (colored border, tinted background, colored text)
- For removed: badge has line-through text and reduced opacity

---

### Test 2.5: Due date change activity

**Steps:**
1. Find/trigger a due date change activity

**Expected:**
- Text: "{actor name} changed the due date"
- From/to badges with formatted dates (e.g., "None" → "Apr 10, 2026")
- "To" badge has amber styling

---

### Test 2.6: Task created activity

**Steps:**
1. Scroll to the bottom of a task's activity list (oldest entries)

**Expected:**
- Text: "{actor name} created this task"
- Green (emerald) Plus icon on the timeline

---

## Test Suite 3: Infinite Scroll Pagination

### Test 3.1: Infinite scroll loads more activities

**Steps:**
1. Navigate to a task with more than 20 activities
2. Click the "Activity" tab
3. Scroll to the bottom of the activity list

**Expected:**
- A loading spinner appears briefly at the bottom
- New activity items append to the list
- Date grouping updates if new entries belong to different dates
- Scrolling further loads more pages until all activities are shown

---

### Test 3.2: Scroll sentinel is removed when all pages loaded

**Steps:**
1. Navigate to a task with fewer than 20 activities (single page)
2. Click the "Activity" tab

**Expected:**
- No loading spinner at the bottom
- All activities are visible
- No infinite scroll trigger occurs

---

## Test Suite 4: Optimistic Updates from Sidebar

### Test 4.1: Priority change appears immediately in activity log

**Steps:**
1. Navigate to task detail page
2. Click the "Activity" tab (make sure it's visible)
3. In the right sidebar, click the Priority dropdown
4. Change priority from current value to a different one (e.g., "Medium" → "High")
5. Observe the activity list immediately

**Expected:**
- A new activity entry appears at the **bottom** of the list instantly (before API responds)
- The entry shows: "{your name} changed priority from [old] → [new]"
- The priority badges have correct colors
- After 1-3 seconds, the optimistic entry is seamlessly replaced by the server entry (no visual jump)

---

### Test 4.2: Assignee change appears immediately

**Steps:**
1. Ensure Activity tab is visible
2. In the sidebar, click the Assignee dropdown
3. Add or remove an assignee
4. Close the dropdown

**Expected:**
- New activity entry appears at the bottom immediately
- For added: "{your name} assigned this to {user name}"
- For removed: "{your name} unassigned {user name}"
- Replaced by server entry after API completes

---

### Test 4.3: Label change appears immediately

**Steps:**
1. Ensure Activity tab is visible
2. In the sidebar Labels section, click the "+" button
3. Toggle one or more labels on/off
4. Close the dropdown

**Expected:**
- New activity entry appears immediately at the bottom
- Shows all added/removed labels in a single entry with colored badges
- Replaced by server entries after API completes (server may return individual entries per label)

---

### Test 4.4: Due date change appears immediately

**Steps:**
1. Ensure Activity tab is visible
2. In the sidebar, click the Due Date picker
3. Select a new date (or clear the date)

**Expected:**
- New activity entry appears immediately: "{your name} changed the due date [from] → [to]"
- "None" shown for null dates
- Replaced by server entry after API completes

---

### Test 4.5: Status change appears immediately

**Steps:**
1. Ensure Activity tab is visible
2. In the sidebar, click the Status dropdown
3. Change the status/column

**Expected:**
- New activity entry appears immediately: "{your name} moved this task to another column"
- Cyan-colored ArrowRightLeft icon on the timeline
- Replaced by server entry after API completes

---

## Test Suite 5: Optimistic Dedup & Transition

### Test 5.1: No duplicate entries after server refetch

**Steps:**
1. Trigger any sidebar change (e.g., priority change)
2. Wait for the API to complete (watch network tab or wait ~2 seconds)
3. Count the activity entries of that type

**Expected:**
- Only one entry for the change (not duplicated)
- The optimistic entry was seamlessly replaced by the server entry
- No visual flickering or position jumping

---

### Test 5.2: Multiple rapid changes don't produce stale entries

**Steps:**
1. Rapidly change priority 3 times (e.g., Medium → High → Urgent → Low)
2. Wait for all API calls to complete

**Expected:**
- Each change produces its own activity entry
- All 3 entries are present after server refetch
- No leftover optimistic entries remain

---

### Test 5.3: Optimistic entries clear on navigation away

**Steps:**
1. Trigger a sidebar change
2. Immediately navigate to a different page (e.g., click a breadcrumb)
3. Navigate back to the same task detail

**Expected:**
- The activity list shows only server data (no stale optimistic entries)
- The change made in step 1 appears as a server entry (if API completed)

---

## Test Suite 6: Activity Query Invalidation

### Test 6.1: Activity list refreshes after title rename

**Steps:**
1. Open the Activity tab
2. Note the current number of activity entries
3. Rename the task (via the title edit or rename modal)
4. Observe the activity list

**Expected:**
- A new "updated the title" activity appears in the list
- The list automatically refetched (no manual refresh needed)

---

### Test 6.2: Activity list refreshes after description update

**Steps:**
1. Open the Activity tab
2. Edit the task description and save
3. Observe the activity list

**Expected:**
- A new "updated task description" activity appears

---

## Test Suite 7: Visual & Layout

### Test 7.1: Timeline connector line between items

**Steps:**
1. Navigate to a task with multiple activities in the same date group
2. Inspect the timeline visually

**Expected:**
- A vertical line connects the action icons from one item to the next
- The last item in each date group does NOT have a connector line below it

---

### Test 7.2: Date section headers have correct formatting

**Steps:**
1. Navigate to a task with activities spanning multiple days

**Expected:**
- Today's activities grouped under "TODAY"
- Yesterday's under "YESTERDAY"
- Older dates show as "April 3, 2026" (MMMM d, yyyy format)
- Headers are uppercase, indigo-colored, with a horizontal line divider

---

### Test 7.3: Responsive layout

**Steps:**
1. View the activity tab at different viewport widths (1200px, 1024px, 768px)

**Expected:**
- Activity items don't overflow or break layout
- Content text truncates or wraps gracefully
- Timestamp stays aligned to the right
- Action icons and avatars maintain their size

---

## Quick Reference: Navigation Paths

| Action | URL / Selector |
|--------|---------------|
| Task detail page | `http://localhost:5173/projects/{projectId}/tasks/{ticketId}` |
| Activity tab trigger | Button/tab with text `"Activity"` |
| Comments tab trigger | Button/tab with text `"Comments"` |
| Priority dropdown | Sidebar → button showing current priority icon + label |
| Assignee dropdown | Sidebar → button showing avatar or "Unassigned" |
| Status dropdown | Sidebar → Status section |
| Label toggle | Sidebar → Labels section → "+" button |
| Due date picker | Sidebar → "Due date" section |
| Empty state text | `"No activity yet"` |
| Date group header | Uppercase text like `"TODAY"`, `"YESTERDAY"` |
| Loading spinner | `svg.animate-spin` inside sentinel div |

---

## Quick Reference: Key Selectors for Playwright

```typescript
// Activity tab
page.getByRole('tab', { name: 'Activity' })

// Activity items (each is a div with flex layout)
page.locator('.activity-group > div')

// Date section headers
page.locator('text=/TODAY|YESTERDAY/i')

// Empty state
page.getByText('No activity yet')

// Timeline action icons (colored circles)
page.locator('.rounded-full.ring-\\[3px\\]')

// Actor avatars within activity items
page.locator('[data-slot="avatar"]')

// Loading spinner (infinite scroll)
page.locator('.animate-spin')

// Priority dropdown trigger (sidebar)
page.getByRole('button', { name: /Urgent|High|Medium|Low|No priority/i })

// Assignee dropdown trigger (sidebar)
page.getByRole('button', { name: /Unassigned/i }).or(page.locator('[data-slot="avatar"]').first())
```
