# Route Section Shortcuts Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a read-only Route Inspector keyboard-affordance slice. Do not add route writes, network mutation, gateway changes, interface changes, or privileged command execution.

**Goal:** Close a lazyifconfig Route Inspector control gap by making picos route detail panes directly keyboard-addressable.

**Architecture:** Add a pure shortcut mapper for Route detail panes and wire it into the Routes workspace input path before global numeric screen shortcuts.

**Tech Stack:** Bun, TypeScript, Ink keyboard handling.

## Safety Boundaries

- No route table mutation.
- No gateway changes.
- No interface enable/disable.
- No privileged command execution.
- No new OS command execution path.

## Steps

- [x] **Step 1: Add pure shortcut mapping**
  Map `1`/`2`/`3`/`4` to table/raw/diagnostics/path and Home/End to first/last Route detail panes.

- [x] **Step 2: Wire Routes focus handling**
  Make Routes workspace focus consume those shortcuts before global screen-number navigation.

- [x] **Step 3: Keep state consistent**
  Clear route copy-preview state after direct detail jumps, matching existing Tab behavior.

- [x] **Step 4: Update visible controls**
  Show `tab/1-4 detail` and Home/End in the Routes workspace footer and docs.

- [x] **Step 5: Update roadmap**
  Record the lazyifconfig parity slice and next follow-up.

## Validation

- [x] `bun test tests/routePanel.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
