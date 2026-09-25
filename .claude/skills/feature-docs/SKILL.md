---
name: feature-docs
description: Use when asked to document a recently implemented feature, "write docs for" a ticket/branch/PR, or summarize what a change set implemented — e.g. "document JSP-38", "add a feature doc", "write up what this branch does".
---

# Concise feature docs

Produce a short, scannable Markdown doc for a feature that was just implemented in this repo. The doc is for the next engineer who touches the feature — it surfaces **decisions and gotchas the code can't show**, not a re-telling of the code.

## Source before writing

1. Read the actual change set: `git diff <base>...HEAD --stat` (or `git diff HEAD --stat` for uncommitted work), then the changed files that matter.
2. Read the ticket (Linear `KAN-*`/`JSP-*`) if reachable; note its out-of-scope list — those become follow-ups.
3. Check CLAUDE.md for what it already records about this feature. A convention or gotcha already in CLAUDE.md is **referenced by section name, not restated**.

## Output contract

Write to **`docs/<TICKET>-<slug>.md`** (e.g. `docs/JSP-38-task-search-all-projects.md`). Target **≤ 120 lines / ≈ 600 words**. The doc is exactly these parts, in this order:

```markdown
# <Feature name> (<TICKET>)

> **Status:** Implemented · **Branch/PR:** <ref> · **Date:** <YYYY-MM-DD>

## Overview
2–4 sentences: what the user can now do, where it lives in the UI,
and the one-line data path (service → hook → component).

## Key decisions
3–7 bullets. Each: **decision — why**, only where the "why" is not
recoverable from the code (chosen pattern, rejected alternative,
deliberate limit). No restating repo-wide conventions.

## Affected files
| File | Role |
|---|---|
One row per source file, one line per role. Group all test files
into a single row. New vs modified marked with (new).

## Usage
How to reach and exercise the feature: entry points, keyboard,
flags/env if any. Bullets, not prose paragraphs.

## Testing
Where the tests live, the command to run them, and any test-only
gotcha future edits must respect.

## Maintenance notes
Bullets: invariants that must hold when editing, known gotchas,
and follow-up tickets (with their ticket ids).
```

## Section rules

- **Key decisions is the core of the doc.** If a reader could reconstruct the bullet by reading the file, it isn't a decision — drop it.
- **Affected files replaces per-file narration.** One table row per file; anything longer belongs in Key decisions or Maintenance notes.
- A fact goes in exactly one section. If it's a decision, it isn't repeated under Maintenance.
- A ticket id appears in the doc only when it appears verbatim in a source you read this session (the ticket, CLAUDE.md, the diff, a commit message). If a decision's rationale has no readable source, write the rationale without a ticket id.
- Follow-ups name real ticket ids from the ticket's out-of-scope list; a known gap with no ticket is listed as "not ticketed".
- The long deep-dives already in `docs/` (e.g. `task-subscriptions.md`) are legacy format — new feature docs follow this contract; don't match their length.

## Quick self-check before finishing

- [ ] All 6 sections present, in order, nothing else
- [ ] ≤ 120 lines (`wc -l docs/<file>.md`)
- [ ] No paragraph narrating a single file's internals
- [ ] Nothing duplicated from CLAUDE.md (reference it instead)
- [ ] Every ticket id in the doc traces to a source read this session (grep the repo / re-check the ticket if unsure)
