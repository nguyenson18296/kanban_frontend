# User Mention Feature — Technical Document

## Overview

This document describes the implementation of the `@mention` feature integrated into the tiptap-based rich text Editor component. Users can type `@` followed by a name to search and insert a mention, which is stored as a semantic HTML span and styled consistently across edit and read-only views.

## HTML Format

Mentions are persisted as inline HTML spans with custom data attributes:

```html
<p>
  Hey
  <span data-mention-id="49566b0c-1107-42ae-935e-c5af04f6c450" data-mention="Grace Bui">
    Grace Bui
  </span>, please review this task.
</p>
```

| Attribute          | Purpose                                      |
|--------------------|----------------------------------------------|
| `data-mention-id`  | User UUID — used for linking, notifications   |
| `data-mention`     | Display name — used for rendering and parsing |

## Architecture

The feature is composed of three modules under `src/components/Editor/`, each with a single responsibility:

```
src/components/Editor/
├── mention.ts                 # Tiptap extension (schema + serialization)
├── mention-list.tsx           # React UI component (suggestion dropdown)
├── mention-suggestion.tsx     # Plugin wiring (data fetching + tippy popup lifecycle)
└── index.tsx                  # Editor component (integrates the extension)
```

### Module Breakdown

#### `mention.ts` — Custom Tiptap Extension

Extends `@tiptap/extension-mention` to produce the custom HTML format described above instead of tiptap's default output.

**Key responsibilities:**

- `renderHTML` — Serializes mention nodes to `<span data-mention-id data-mention>` for storage and output via `editor.getHTML()`.
- `addAttributes` — Defines `id` and `label` attributes with `parseHTML` callbacks that read from `data-mention-id` and `data-mention` respectively. This enables round-trip parsing: existing mention HTML loaded into the editor (e.g., when editing a comment) is correctly recognized as mention nodes.
- `parseHTML` — Matches `<span>` elements with a `data-mention` attribute.

#### `mention-list.tsx` — Suggestion Dropdown Component

A `forwardRef` React component that renders the filterable user list inside the suggestion popup.

**Key responsibilities:**

- Renders user avatars (via shadcn `Avatar`) and names in a scrollable list styled to match the project's shadcn `DropdownMenu` patterns (`bg-popover`, `rounded-md border`, `shadow-md`, item highlight via `bg-accent`).
- Manages `selectedIndex` state for keyboard navigation.
- Exposes `onKeyDown` via `useImperativeHandle` so tiptap's suggestion plugin can forward `ArrowUp`/`ArrowDown`/`Enter` keystrokes (tiptap intercepts these at the editor level before they reach the popup DOM).
- Auto-scrolls the active item into view via `scrollIntoView({ block: "nearest" })`.
- Guards against empty `items` to prevent `NaN` from modulo operations on `items.length === 0`.

#### `mention-suggestion.tsx` — Suggestion Plugin Configuration

A factory function `createMentionSuggestion()` that returns the tiptap suggestion plugin config, connecting data fetching, filtering, and popup lifecycle.

**Key responsibilities:**

- `items({ query, editor })` — Reads the user list from the `useStoreUsersList` Zustand store (via `getState()`, not a hook, since this runs outside React's render cycle). Filters out users already mentioned in the current document by traversing `editor.state.doc.descendants()`. Applies query-based filtering and caps results at 10.
- `render()` — Manages the popup lifecycle using `ReactRenderer` (to mount `MentionList` outside React's tree) and `tippy.js` (for positioning). The `popup` variable is typed as `TippyInstance | null` with optional chaining on all accesses, guarding against the case where `clientRect` is missing during `onStart`.

#### `index.tsx` — Editor Integration

The `Editor` component creates a per-instance suggestion config via `useState(createMentionSuggestion)` to ensure multiple Editor instances on the same page have isolated popup/renderer state. The suggestion config is passed to `CustomMention.configure({ suggestion })`.

## Data Flow

```
User types "@gr"
       │
       ▼
┌─────────────────────────┐
│  Tiptap Suggestion      │  Triggers items() callback
│  Plugin                 │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  items({ query, editor})│  1. Scan doc for existing mention node IDs
│  (mention-suggestion)   │  2. Read users from Zustand store
│                         │  3. Filter out already-mentioned users
│                         │  4. Filter by query string "gr"
│                         │  5. Return top 10 matches
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  MentionList            │  Renders filtered users in tippy popup
│  (mention-list)         │  Handles keyboard nav + click selection
└────────┬────────────────┘
         │  User selects "Grace Bui"
         ▼
┌─────────────────────────┐
│  command({ id, label }) │  Tiptap inserts mention node into document
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  editor.getHTML()       │  <span data-mention-id="..." data-mention="Grace Bui">Grace Bui</span>
│  → onChange callback    │
└─────────────────────────┘
```

## Styling

Mention styles are defined in `src/index.css`, scoped to the two containers where mention HTML renders:

```css
.editor-content [data-mention],
.prose [data-mention] {
  color: #6366f1;
  font-weight: 500;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  background: rgb(99 102 241 / 0.1);
}
```

| Container          | Context                                         |
|--------------------|-------------------------------------------------|
| `.editor-content`  | Tiptap editor (live editing)                    |
| `.prose`           | Read-only comment view (`TaskCommentItem`)       |

The suggestion dropdown uses Tailwind classes matching the shadcn `DropdownMenu` component: `bg-popover`, `text-popover-foreground`, `rounded-md border shadow-md` for the container; `bg-accent text-accent-foreground` for the selected item.

## Security: DOMPurify Configuration

Comment content is sanitized via DOMPurify before rendering with `dangerouslySetInnerHTML`. By default, DOMPurify strips non-standard `data-*` attributes. The mention attributes are explicitly allowed:

```tsx
DOMPurify.sanitize(comment.content, {
  ADD_ATTR: ["data-mention-id", "data-mention"],
})
```

This is configured in `src/components/TaskComment/item.tsx`.

## Dependencies Added

| Package                      | Version  | Purpose                                  |
|------------------------------|----------|------------------------------------------|
| `@tiptap/extension-mention`  | `3.20.0` | Tiptap mention node type                 |
| `@tiptap/suggestion`         | `3.20.0` | Suggestion plugin (trigger, filtering)   |
| `tippy.js`                   | `6.3.7`  | Popup positioning for suggestion list    |

Versions `3.20.0` are pinned to match the existing `@tiptap/core` and `@tiptap/pm` versions in the project to avoid peer dependency mismatches.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Custom `renderHTML`/`parseHTML` instead of default tiptap mention output | The backend expects `data-mention-id` / `data-mention` attributes, not tiptap's default `data-type="mention" data-id` format. Custom serialization ensures the stored HTML matches the API contract. |
| `useStoreUsersList.getState()` instead of a React hook | The `items()` callback runs outside React's render cycle (called by tiptap's ProseMirror plugin). Zustand's `getState()` is the correct way to read store state synchronously in non-React contexts. |
| `useState(createMentionSuggestion)` for per-instance config | The suggestion `render()` closure holds mutable state (`renderer`, `popup`). A module-level singleton would cause multiple Editor instances to share and corrupt that state. `useState` with an initializer runs once per mount and is stable across re-renders, avoiding `useMemo` per the React Compiler convention. |
| `useImperativeHandle` for keyboard forwarding | Tiptap intercepts keyboard events at the editor/ProseMirror level. The suggestion plugin needs to call into the React component to update selection state. `useImperativeHandle` exposes an `onKeyDown` method on the ref, enabling this bridge without DOM event workarounds. |
| `forwardRef` on `MentionList` | Required by `useImperativeHandle` and by `ReactRenderer` which needs a ref to call the exposed methods. React Compiler does not replace this pattern. |
| Scoped CSS selectors | `[data-mention]` alone would style any element in the app with that attribute. Scoping to `.editor-content` and `.prose` limits the styles to the two known render contexts. |
| Filter already-mentioned users from suggestions | Prevents duplicate mentions of the same user in a single comment. Uses `editor.state.doc.descendants()` to scan the document for existing mention nodes, which is the single source of truth. If a mention is deleted from the editor, the user becomes available again. |

## Files Changed

| File | Change |
|------|--------|
| `src/components/Editor/mention.ts` | **New** — Custom tiptap Mention extension |
| `src/components/Editor/mention-list.tsx` | **New** — Suggestion dropdown React component |
| `src/components/Editor/mention-suggestion.tsx` | **New** — Suggestion plugin factory |
| `src/components/Editor/index.tsx` | **Modified** — Integrated CustomMention extension |
| `src/components/TaskComment/item.tsx` | **Modified** — Added `ADD_ATTR` to DOMPurify config |
| `src/index.css` | **Modified** — Added scoped mention styles |
| `package.json` | **Modified** — Added 3 dependencies |
