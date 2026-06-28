# Viewable CLI OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default `picos` TUI visibly usable as a keyboard-driven CLI OS shell.

**Architecture:** Add tested pure navigation and action metadata in `core`, then render those concepts through Ink panels. Keep all OS-changing actions disabled by default.

**Tech Stack:** Bun, TypeScript, Ink, React, cac, Biome.

---

## Tasks

### Task 1: Tests First

- [ ] Add failing tests for TUI screen navigation behavior.
- [ ] Add failing tests for action catalog safety defaults.
- [ ] Run `bun test` and confirm the new tests fail because modules are missing.

### Task 2: Core Metadata

- [ ] Implement `src/core/actions.ts`.
- [ ] Implement `src/core/roadmap.ts`.
- [ ] Implement `src/tui/navigation.ts`.
- [ ] Run `bun test` and confirm all tests pass.

### Task 3: Panel UI

- [ ] Update `src/tui/App.tsx` to support six panels and arrow/vim navigation.
- [ ] Add Status and Actions screens.
- [ ] Improve Dashboard, Network, DNS, and Logs copy so the first screen feels like a console.

### Task 4: Verification

- [ ] Run `bun run lint`.
- [ ] Run `bun test`.
- [ ] Run `bunx tsc --noEmit`.
- [ ] Run `bun run build`.
- [ ] Run `bun src/bin/picos.ts version` and `bun src/bin/picos.ts doctor`.
