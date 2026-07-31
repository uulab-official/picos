# Operations Preset Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Verified; the full gate is green, including `tsc --noEmit` and the whole 802-test suite. Two draft estimates were wrong and are corrected below: `tests/statusActivityQueue.test.ts` needs no change because its coverage strings are input fixtures, and the `App.tsx` change is required but for a different reason than the draft gave.

**Goal:** Make saved operation presets visible from the TUI Config workspace without pretending they are workspace-owned and without adding a preset execution path.

**Architecture:** Operation presets are the only config-backed collection that no TUI workspace owns, because `picos operations` is their editor by design. Rather than invent an owner, Config reports them as coverage: the existing `shelf coverage` line gains an `operationPresets` count, the empty-shelf recovery hint points at the CLI instead of a workspace jump, and no `ConfigManagedShelfTarget` is added. `interfaceEvidenceSearchPresets` already sets this precedent as a config array that is deliberately not a managed shelf target.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

## Decision: Coverage, Not A Managed Shelf

Every `ConfigManagedShelfTarget` in `src/tui/configPanel.ts` requires four things that operation presets do not have:

1. `workspace: Screen` — an existing TUI workspace to jump to.
2. `focusArea` plus a `ConfigManagedShelfFocusCursor` to land on.
3. A `ConfigManagedShelfFocusAction` describing what `enter` does once there.
4. For recovery, a `ConfigRecoveryDirectPromptPlan` prompt that can create the missing entry.

Three options were considered.

**Option A — add an Operations workspace.** Rejected for this slice. It needs a new `Screen`, a keyboard slot, compact and expanded layouts, and, decisively, an execution path: `enter` on a preset would run it, and a maximal monitor preset occupies the 300,000 ms interval-span cap plus one process-collector call per sample, each bounded by its own 5,000 ms `safeExec()` timeout, so the worst case is several minutes beyond the cap. The TUI has no cancellation model for a long local collector; the only comparable case, the SFTP session, needed visible `X` cancellation plus exact-confirm `R` retry before it was allowed to block. Running presets from the TUI is therefore its own slice with that prerequisite, not a side effect of adding visibility.

**Option B — Config-owned coverage rows.** Chosen. Small, matches the existing `interfaceEvidenceSearchPresets` precedent, and honest: it shows what is saved and states that the CLI owns editing.

**Option C — recovery hint only.** Rejected as strictly weaker than B; it would report the empty case but hide a populated shelf.

## Task 1: Coverage Row Coverage

**Files:**

- Modify: `tests/configPanel.test.ts`
- Modify: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Update the exact coverage strings**

Only `tests/configPanel.test.ts` asserts output derived from `formatConfigManagedShelfRows()`. The coverage strings in `tests/statusActivityQueue.test.ts` are **input fixtures** handed to `formatStatusActivityQueueRows()` and `formatStatusActivityDetailRows()`, not derived values, so they need no change and no `rows=` count shifts. The original draft overstated this.

The populated case spreads `defaultConfig`, so it needed an explicit `operationPresets` entry to stay fully populated: saved moves 8 to 9 and the coverage row gains `operationPresets=1`. The sparse case moves empty 7 to 8, gains `operationPresets=0`, and appends `,operationPresets` to the empty-shelf list.

- [x] **Step 2: Add the empty-shelf recovery expectation**

```ts
"recovery operationPresets -> picos operations kinds"
```

- [x] **Step 3: Run focused tests and verify RED, then GREEN after Task 2**

Run:

```bash
bun test tests/configPanel.test.ts
```

## Task 2: Report The Count From Config

**Files:**

- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Extend the coverage key union**

Added `operationPresets` to `ConfigManagedShelfCoverageKey`, last so the emission order matches the `shelfCounts` object literal. It was deliberately **not** added to `ConfigManagedShelfTarget`, `ConfigManagedShelfFocusCursor`, `ConfigManagedShelfFocusAction`, or the recovery prompt union, because all four imply a workspace jump that does not exist.

- [x] **Step 2: Emit the count and the CLI recovery hint**

The count joins the `shelf coverage` row and the empty-shelf name list. `formatConfigManagedShelfRecoveryRows()` returns `recovery operationPresets -> picos operations kinds` for this key before the workspace-handoff path runs, and `getConfigManagedShelfRecoveryTarget()` now takes `Exclude<ConfigManagedShelfCoverageKey, "operationPresets">`, so removing that guard fails to compile rather than silently falling through to its `logs` default. The trailing row became `managed-by=Routes/Connections/Ports/Tools/Logs/Remotes workspaces + operationPresets via picos operations`.

- [x] **Step 3: Wire the live count in App**

This step was misjudged twice before it was right.

The draft said App needed a state slice because the row builder took injected counts. That reasoning was wrong: `formatConfigManagedShelfRows(config: PicosConfig)` reads counts straight off the config, and the injected-count pattern belongs to a different function, the command-palette preview's `configManagedShelfCounts`.

The correction then over-swung to "no App change needed", based on a `grep` for `operationPresets` whose output was truncated. `App.tsx` does not spread a real config into that call; it builds the argument as an inline object literal, and that literal already carried a hardcoded `operationPresets: []`. Adding the coverage key would therefore have compiled and shipped a row that always read `operationPresets=0`, which is worse than a type error because nothing would have failed.

The wiring is four edits: an `operationPresets` state slice typed as `PicosConfig["operationPresets"]` so no new import is needed, `setOperationPresets(config.operationPresets)` in `syncConfigSessionState()` beside the interface-evidence restore, replacing the hardcoded `[]` in the memo literal, and adding the value to the memo dependency array. The TUI still never writes presets.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/configPanel.test.ts
```

## Task 3: Product Docs And Roadmap

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document the Config row**

The README Config workspace bullet now records the operation preset count and the CLI recovery hint, and states that the TUI does not edit or run presets.

- [x] **Step 2: Add the roadmap slice**

Added `v0.4.342 - Operations Preset Visibility` above `v0.4.341`, repointed v0.4.341's `Next` line at it, and pointed the new slice's `Next` at the Operations workspace with its cancellation-model prerequisite.

- [x] **Step 3: Run full verification**

Run:

```bash
bunx biome check . --write
bun run verify
bun run release:check
git diff --check
```

## Audit Results

Consumer audit of everything this slice changed. Only the `App.tsx` literal needed a fix; the rest are recorded so the next change does not have to re-derive them.

- `getConfigManagedShelfRecoveryTarget()` has exactly one caller, inside the new `operationPresets` guard, so narrowing its parameter type breaks nothing today and breaks the build if the guard is ever removed.
- `ConfigManagedShelfCoverageKey` is module-private and appears only in the `shelfCounts` record, the `emptyShelves` cast, and the recovery-row parameter. No switch or lookup table silently misses the new member.
- The trailing row keeps its `managed-by=` prefix, which matters because `App.tsx` colours that row by `row.startsWith("managed-by=")`. Changing the prefix would have silently changed the colour.
- `shelfRows` is rendered with a plain `.map()` and no slice or height cap, so the added recovery row makes the block one line taller rather than pushing the trailing row out of view. The empty case already emitted seven recovery rows.
- That render uses `key={row}`, so every row string must stay unique within the block. The new recovery row is unique, and all other rows have distinct prefixes. Worth remembering before adding a row that could repeat.
- The coverage row is now roughly 145 characters and wraps at 80 columns. It already wrapped at roughly 125 characters before this slice, so this is a pre-existing compact-layout wart that this change makes slightly worse, not a new one.

### Status Activity Is A Second Consumer

`App.tsx` passes `configManagedShelfRows` as `configRows` into the Status Activity queue at four call sites, so these rows have a consumer outside the Config workspace. Task 1 Step 1 correctly says `tests/statusActivityQueue.test.ts` needs no change, but its "no `rows=` count shifts" wording describes the tests only. At runtime the count does shift, and that is fine. The distinction matters enough to state exactly:

- `formatStatusActivityDetailRows()` emits `rows=${rows.length}` from the **raw** `configRows`, not from the prioritized subset. So when the `operationPresets` recovery hint is active, the runtime count is one higher than before this slice. No test asserts it, because the test fixtures are literal arrays rather than real `formatConfigManagedShelfRows()` output, and `tests/configPanel.test.ts` is the only test that calls the real builder and it asserts the array directly without routing it through Status.
- `getConfigActivityDetailRows()` selects with one `.find()` per prefix for `shelf coverage `, `empty shelves `, and `recovery `, yielding at most three rows, which is exactly what the following `.slice(0, 3)` shows. There is therefore no displacement risk from adding rows: a new row cannot push an existing prefix out of the visible detail.
- Because the coverage row is modified in place rather than added, `find("shelf coverage ")` still selects it and it keeps its detail slot with longer text.
- Because `find("recovery ")` takes only the **first** recovery row, the new `recovery operationPresets` row is never the one shown. This is settled rather than likely: `operationPresets` is the eighth and last key in the `shelfCounts` literal, `emptyShelves` preserves that order through `Object.entries()`, and `formatConfigManagedShelfRecoveryRows()` maps over it in order, so the new row is always last and `recovery routeFilters` is always the row `find()` returns. The hint is therefore reachable in the Config workspace block, which renders every row, but not in the Status Activity detail view, which shows one recovery row. That is a pre-existing property of the prioritizer rather than a regression, and it is why this slice does not rely on Status Activity to advertise the hint.

## Out Of Scope

- Any TUI path that creates, edits, removes, or runs an operation preset. `picos operations` stays the only editor, and running from the TUI is blocked on a cancellation model for bounded monitor sampling.
- A new `Screen` or keyboard slot.
- Adding `operationPresets` to `ConfigManagedShelfTarget` or to the exact-confirm `reset config` key union.

## Follow-On: Operations Workspace

If the Operations workspace is built later, it needs, in order: a cancellation model for a run that can occupy 300,000 ms, a visible sampling-progress row, exact-confirm retry after cancellation, and audit rows for started/cancelled/completed runs. Only then does `enter` on a saved preset become a safe action.

The first of those now exists in the core, which is the part that had to be settled before any UX could be designed around it. `collectSystemMonitorSeries()` takes an optional `shouldContinue` predicate as its last parameter and returns `cancelled` on the series; `formatMonitorSeriesJson()` publishes it as `data.cancelled`. Three decisions in it are the ones a workspace would have depended on either way:

- The predicate is consulted **after** each sample, never before, so a stopped run keeps every sample it already paid for and never sleeps through an interval for a sample it will not take. Cancelling therefore degrades the result instead of discarding it, which is what makes a progress row plus a stop key a coherent design rather than a way to lose work.
- Stopping is not an error. There is no throw and no rejected promise, so the caller gets a shorter series with `requestedCount` intact and can report "2 of 10" without inspecting an exception.
- `cancelled` is explicit even though `samples.length < requestedCount` implies it, for the same reason `data.limitReached` is explicit on the logs side: the derivation is only sound for a reader who already knows the two counts are otherwise always equal.

What is deliberately **not** done: nothing calls it yet. Both CLI callers still pass four arguments and take the default predicate, so cancellation is dormant capability rather than reachable behaviour. That is the intended state, because the caller that needs it is the workspace, and the workspace still needs its remaining three prerequisites.

Those three are UX decisions rather than engineering ones, so they are written up separately as options with precedent and recommended defaults in [2026-07-29-operations-workspace-options.md](2026-07-29-operations-workspace-options.md), to be agreed before any of it is built. That document also records why monitor cancellation is partial-result based while the SFTP session is error-based, since the two modules would otherwise look inconsistent.
