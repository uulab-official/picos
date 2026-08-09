# App State Transition Extraction Design

**Status:** Approved by the active goal to finish the current read-only/local-write product boundary.

## Goal

Move the remaining guards, list-selection resolution, state transitions, and operator-facing message decisions out of `src/tui/App.tsx` into tested, feature-owned `src/tui/*.ts` modules while keeping React state wiring and I/O in the component.

## Context

`App.tsx` is 18,638 lines and contains 154 semantic `useCallback()` declarations plus the global `useInput()` dispatcher. Three callbacks use line-wrapped initializers and are missed by the simpler one-line search that originally reported 151. No test imports the component, so a decision left in one of those callbacks is unverified by construction. The repository already establishes the target shape through modules such as `operationRunPanel.ts`, `fileOperationDialog.ts`, `editorBuffer.ts`, `toolHistory.ts`, `interfacePanel.ts`, and `navigation.ts`.

The remaining inline selection arithmetic includes a real empty-list defect class. Several tool-target preset paths clamp with `Math.min(Math.max(index, 0), items.length - 1)`, which produces `-1` when the list is empty. Other callbacks repeat last-item selection, evidence-index refresh clamping, editor cursor repair, interface target selection, and command cancellation wording.

## Approaches Considered

### 1. Feature-owned pure transitions (selected)

Each behavior family owns small pure functions that consume the current state and input and return the next state plus explicit intents such as a command-line transition, notice, or selected index. `App.tsx` applies those results to React setters and performs the I/O.

This follows the existing architecture, lets each slice use focused Bun tests, and keeps commits small enough to review and push independently.

### 2. One global reducer

A reducer could centralize most TUI state, but migrating more than one hundred callbacks at once would mix unrelated workspaces, create a large action union, and make regression review harder. It is not required to close the current product-boundary gap.

### 3. Ink component tests around the existing callbacks

Component tests would exercise rendering and key dispatch, but they would leave business decisions coupled to React and would conflict with the repository rule that guards and transitions belong in sibling pure modules. They may be useful later for rendering integration, but they are not the solution to this goal.

## Architecture

### Feature ownership

- Tool-target preset selection and mutation transitions stay in `src/tui/toolHistory.ts`.
- Editor buffer mutation, cursor repair, and resulting notice text stay in `src/tui/editorBuffer.ts`.
- File loading, navigation, preview, and file-operation guards stay in `src/tui/fileSelection.ts`, `src/tui/fileHistory.ts`, `src/tui/fileOperationDialog.ts`, and a focused file-workspace transition module where those owners do not fit.
- Config, route, endpoint, Timeline, Logs, process, operation-run, remote, status-activity, and status-evidence decisions stay in their existing feature modules, with a focused module added only when no current owner fits.
- Evidence-index refresh selection transitions use the owning evidence module where one exists; shared list-index repair uses `clampIndex()` from `src/tui/navigation.ts`.
- Interface target selection resolution stays in `src/tui/interfacePanel.ts`; DNS proposal decisions stay in a focused `src/tui/dnsPanel.ts` module.
- Command-line cancellation classification, cleanup intents, and cancellation wording stay in a focused `src/tui/commandCancellation.ts` module because they span workspaces.
- `App.tsx` retains React setters, refs, timers, async collector calls, provider calls, and sequence/token checks.

### Transition shape

Pure transition functions return domain state and explicit effects as data. A typical result may contain `selectedIndex`, a normalized item list, a command-line action, and an optional `{ level, message }` notice. The component does not reconstruct the guard or wording after receiving the result.

No transition function performs filesystem, process, network, config, clipboard, or terminal I/O. Async state publication continues to use the existing request sequences and run tokens.

### Selection rules

- Every list index is clamped with `clampIndex(index, length)` rather than inline arithmetic.
- An empty list resolves to index `0`, never `-1`.
- A selected item is resolved only after clamping.
- Removing or refreshing items repairs the selection in the same pure transition that returns the new list.
- Selecting the newest result is expressed by a tested helper or owning transition rather than repeating `Math.max(0, length - 1)` in the component.

## Implementation Slices

1. A source audit and manifest that inventories all 154 callbacks plus `useInput`, detects missing/stale classifications, and exposes the remaining decision count.
2. Tool-target preset selection and mutation transitions, starting with the empty-list `-1` defect.
3. Editor append/insert/replace/delete/undo cursor and notice transitions.
4. File, Config, route, endpoint, Timeline, Logs, and palette input transitions.
5. Evidence and recovered-export refresh, archive/open, and newest-result selection transitions across handoff, audit, cleanup, Tools, process, remote-known-hosts, Timeline, and status activity.
6. Interface and DNS target selection and proposal transitions.
7. Remote profile, trust, known-hosts, connection-lifecycle, process, operation-run, action, and control transitions.
8. Command-line cancellation classification, dialog cleanup intent, and message resolution.
9. A final callback and `useInput` dispatch sweep that leaves only classified wiring/I/O and stale sequence/token publication checks.

Each slice updates `docs/INCOMPLETE_FEATURES_CHECKLIST.md`, runs focused tests, creates a scoped commit, and pushes the current branch. User-visible fixes also update `CHANGELOG.md`.

## Testing

Every new transition starts with a focused failing Bun test that names the concrete regression it catches. Tests use literal expectations and real pure functions without mocks. Each slice runs its focused test file and related regressions before commit.

The final gate is:

```bash
bun run verify
bun run release:check
```

## Completion Evidence

The goal is complete only when all of the following are true:

- A TypeScript-AST callback audit covers all 154 current `useCallback()` declarations and the `useInput()` dispatcher, including the three line-wrapped declarations.
- No guard, list-selection resolution, domain state transition, or operator-facing message decision remains inline in those component callbacks; remaining branches are React wiring, I/O dispatch, or stale-request/token publication checks.
- No list-selection clamp in `App.tsx` uses inline `Math.min()` / `Math.max()` arithmetic. Layout sizing arithmetic is explicitly outside this rule.
- Every extracted decision has a focused test in `tests/`.
- `docs/INCOMPLETE_FEATURES_CHECKLIST.md` records the completed slices and points to the audit evidence.
- The worktree is clean after all scoped commits are pushed.
- `bun run verify` and `bun run release:check` pass on the final branch head.

## Out of Scope

- Splitting the rendering tree into multiple React components.
- Replacing all TUI state with one reducer.
- Changing keyboard bindings or adding product features.
- Enabling OS mutation or SFTP writes.
- Refactoring layout sizing, clipping, and visible-row calculations that do not select a domain item.
