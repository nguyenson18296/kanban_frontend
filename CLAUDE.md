# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanban board application built with React 19, TypeScript, and Vite 7. Currently in early stage (scaffolded from Vite template, no kanban features implemented yet).

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build` (runs `tsc -b && vite build`)
- **Lint:** `pnpm lint` (ESLint with flat config)
- **Preview prod build:** `pnpm preview`
- **No test runner is configured yet.**

Package manager is **pnpm**.

## Tech Stack

- **React 19** with React Compiler enabled (automatic memoization via `babel-plugin-react-compiler`)
- **TypeScript 5.9** in strict mode (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **Vite 7** with `@vitejs/plugin-react` (Babel-based, not SWC)
- **ESLint 9** flat config with `typescript-eslint`, `react-hooks`, and `react-refresh` plugins

## Architecture

- `src/main.tsx` — Entry point, renders `<App />` into root with StrictMode
- `src/components/` — Component directory (empty, ready for development)
- `src/assets/` — Static assets (SVGs)
- Plain CSS files (`App.css`, `index.css`) with CSS variables and light/dark mode support

## Key Conventions

- React Compiler is active — avoid manual `useMemo`/`useCallback`/`React.memo`; the compiler handles memoization automatically
- TypeScript is set to `noEmit` — Vite handles transpilation, `tsc` is only for type checking
- ESM-only project (`"type": "module"` in package.json)
