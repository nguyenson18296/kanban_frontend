---
name: ticket-review
description: Ticket-aware code-quality review of the current branch. Use when asked to "review my changes / PR / branch", "review this against the ticket", "code quality review", or before opening a PR. Reads the linked Linear KAN-<n> ticket and the git diff, then reviews against CLAUDE.md and the project's react / testing / a11y skills.
---

# Ticket-aware code review

Reviews the current change set against two things at once: **(a) what the linked ticket actually asked for** (scope) and **(b) the project's code-quality standards**. The value over a plain diff review is the ticket cross-check — catching "the diff doesn't do what the ticket asked" and "the diff does things the ticket never asked for."

Repo context: a **client-only Vite + React 19 SPA** — React Compiler is on; there is no Next.js / RSC / SSR / backend here. Carry that framing into every check (see CLAUDE.md).

Do the steps in order. Keep the review honest: only flag things you can point to in the diff.

## Step 0 — Read the standards first (before you judge)

Read the project's conventions up front so they're in context **before** you look at any diff — this is the single biggest guard against false positives:

- **`CLAUDE.md` (repo root)** is the source of truth for architecture and conventions: the data-flow / query-key discipline, cache-vs-store optimism, atomic Zustand selectors, RHF+Zod form wiring, the `HttpError` / `toastError` error contract, `dompurify` sanitization, testing setup (Vitest + Testing Library, colocated `tests/`, `test-factories` signatures), file/naming rules, and the "Project Skills" relevance limits. It's usually auto-loaded, but read it explicitly so this skill works in a fresh/subagent context.
- Key framing to apply everywhere: this is a **client SPA with the React Compiler on** — so **ignore any RSC / server-component / SSR / Next.js guidance** the skills mention, and **don't suggest manual `useMemo` / `useCallback` / `React.memo`** (the compiler handles memoization). TS `enum`s are build errors (`erasableSyntaxOnly`).

(There is no separate rubric file in this repo; the dimensions and output format below are the review discipline.)

## Step 1 — Resolve the ticket

- `git branch --show-current`. Branches are `feat/KAN-<n>/<slug>`, `chore/KAN-<n>...`, etc.; the Linear key is `KAN-<n>`.
- Extract the `KAN-<n>` key. If none is present, ask the user for the ticket key/URL — or, if they say there's no ticket, proceed with `NO TICKET CONTEXT` and skip the scope checks (state this in the output).

## Step 2 — Fetch the ticket

- Use the **Linear MCP** if it's connected: `ToolSearch` for `linear` (e.g. a get-issue tool), load the schema, and fetch the issue by key. Capture: **title, description, acceptance criteria**, and any linked design/Figma.
- If no Linear MCP is connected/authenticated (or the fetch fails), ask the user to paste the ticket's title + acceptance criteria. Don't block — fall back to `NO TICKET CONTEXT` if they can't.

## Step 3 — Gather the change set (read, don't infer)

- Base branch is `main`. Best-effort refresh: `git fetch origin main --quiet`.
- Scope + counts (never cite a number without the command that produced it):
  - `git diff --stat origin/main...HEAD` (committed on this branch vs base)
  - `git diff HEAD` (uncommitted working tree) — include if non-empty
- Full patch: `git diff origin/main...HEAD` (redirect to a file and Read it if large).
- **Read the actual changed files**, not just the patch — the surrounding lines the diff hides (guards, hooks, existing constants, colocated tests) are exactly where false positives come from.

## Step 4 — Review

Apply in this order:

1. **Ticket scope** (skip if `NO TICKET CONTEXT`):
   - **Coverage:** does the diff satisfy every acceptance criterion? List any criterion with no corresponding change → gap.
   - **Creep:** any changes unrelated to the ticket (drive-by refactors, formatting, dep bumps)? Flag them.
2. **Project standards — `CLAUDE.md`**: check the diff against the repo's documented conventions (data layer + query keys, cache-vs-store optimism, atomic selectors, RHF+Zod, the error contract, sanitization, colocated tests + factory signatures, naming, the a11y floor). CLAUDE.md wins on any conflict.
3. **Skills** — invoke the relevant project skills in `.claude/skills/` for the files in the diff, applying the CLAUDE.md relevance limits (client SPA, Compiler on):
   - `react-patterns` — React component/hook changes (hooks discipline, derive-don't-store, composition over boolean-prop sprawl, React 19 ref-as-prop / `use()`); skip its Server/Client-Component and server-fetch sections.
   - `react-performance` — perf-sensitive changes (client re-render / rendering / bundle rules); its manual-memo category is review-only under the Compiler, and its RSC / Next.js rules don't apply.
   - `frontend-a11y` — any interactive component or form (labels, ARIA, keyboard nav, focus management, visible focus).
   - `react-testing` — test changes (RTL + Vitest technique, accessible queries, awaited `userEvent`); MSW and axe are not used in this repo.
   - `vite-patterns` — `vite.config.ts` / build / env changes (mind the version-skew notes in CLAUDE.md; keep the Babel `@vitejs/plugin-react` + React Compiler setup).
   - `frontend-patterns` — general FE; prefer the more specific skills above and CLAUDE.md, which override it.

## Step 5 — Output

- Prepend one **Ticket scope** line: `Met` / `Partial — <missing criteria>` / `Scope creep — <unrelated changes>` / `No ticket context`.
- Then: **Executive summary + ship / no-ship**, **The Good**, **Critical issues (Must Fix)**, **Suggestions**, and an **Actionable checklist** tagged `[MUST]` / `[SHOULD]` / `[COULD]`.

## Guardrails (enforce them)

- Only flag issues **inside the diff**; pre-existing patterns outside the changed lines are out of scope.
- Every **Critical** must cite a specific diff line you actually read — no theoretical risks, no inferring behavior from names.
- Don't inflate severity; don't suggest extraction without 3+ call sites; don't suggest new logging/metrics/manual-cleanup patterns with no repo precedent; don't suggest manual memoization (React Compiler) or RSC / SSR / Next.js changes (client Vite SPA).
- After a signature change, grep the colocated `tests/` folders + `vi.mock` usages for stale assertions (`toHaveBeenCalledWith`, …) — `tsc -b` won't catch runtime mock mismatches. Verify with `pnpm lint`, `pnpm exec tsc -b`, and `pnpm test --run`.
