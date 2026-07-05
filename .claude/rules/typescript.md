# TypeScript rules

Conventions for writing TypeScript in this repo — a **single-package Vite + React 19 client SPA** (not a monorepo; no `apps/`, `packages/`, or workspaces). Grounded in the actual `tsconfig.app.json` and code — match it, don't fight it. See CLAUDE.md's "Types, forms & validation" for the broader data/validation conventions.

## Type-checking

- **The build DOES fail on type errors.** `pnpm build` runs `tsr generate && tsc -b && vite build`; `tsc -b` (project references: `tsconfig.app.json` + `tsconfig.node.json`) type-checks and fails on any error. There is no `ignoreBuildErrors` and `strict` is on.
- `tsc` is type-check only (`noEmit`; Vite does the transpilation). Run `pnpm exec tsc -b` (or `pnpm build`) before considering type work done.
- The codebase is currently **clean**: zero type errors, zero `any`, zero `@ts-ignore`/`@ts-expect-error`. Keep it that way — don't introduce the first one.

## Compiler flags actually enabled (`tsconfig.app.json`)

`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`; bundler mode: `moduleResolution: bundler`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `moduleDetection: force`, `allowImportingTsExtensions`, `noEmit`. Target/lib ES2022. Path alias `@/*` → `./src` (the only alias).

- **`verbatimModuleSyntax`**: use `import type { X }` / `export type { X }` for type-only imports and exports; don't mix a type-only symbol into a value import. (A value+type dual export like the `const NotificationType` object is imported as a value.)
- **`erasableSyntaxOnly`**: no constructs that need runtime emit beyond type-erasure — **no TS `enum`s**, no parameter properties, no `namespace`. Model enums as a string-literal union, or a `const` object + derived union when the values are needed at runtime (see CLAUDE.md).
- **`noUnusedParameters` / `noUnusedLocals`**: prefix an intentionally-unused parameter with `_` (e.g. `(_data, _error, variables)`); a genuinely unused lone param is an error.
- Note: `noUncheckedIndexedAccess` is **not** enabled, so `arr[i]` / `record[key]` is typed as `T`, not `T | undefined`. Still guard access where the data may actually be sparse.

## Never suppress the compiler

- **No `@ts-ignore` / `@ts-expect-error`** (currently zero). If the compiler is right, fix the code; if a third-party type is wrong, narrow at the boundary.
- **Avoid `any`** (currently zero). Reach for `unknown` + narrowing, a real type, or a generic. Validate untrusted external data (socket payloads, URL/router params, form input, third-party responses) with Zod at the boundary; don't re-validate data your own authenticated backend returned.
- Use `as` assertions sparingly and only when you know something the compiler can't — prefer type guards / narrowing. Never `as any` or double-cast (`as unknown as X`) to force a shape.

## Style (match the codebase)

- **`interface` for object shapes** (props, API responses, DTOs); it's the prevailing choice. Use `type` for unions, tuples, mapped/utility types, and function signatures.
- **Components are plain functions:** `export default function Foo(props: FooProps)` or `export function Foo(...)`. Don't introduce `React.FC`. Pass `ref` as a normal prop (React 19) — no `forwardRef` in new code.
- Import via the `@/*` alias, not deep relative paths. Domain types live in `src/types/*.type.ts`, re-exported through the `@/types` barrel; API field names are `snake_case` (they mirror the backend).
- Type exported boundaries (props, return values); let inference handle obvious locals — don't annotate what's already clear.

## Scope

- Keep type changes surgical (see CLAUDE.md working style). Don't widen or refactor unrelated types because you were nearby.
- Add a shared type to the existing `src/types/` location (and the `@/types` barrel) — don't create a global `.d.ts` unless it's genuinely ambient.
