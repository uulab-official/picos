# App State Transition Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to execute this plan task by task. Every production change also requires `superpowers:test-driven-development`; the final claim requires `superpowers:verification-before-completion`.

**Goal:** Remove every guard, domain selection decision, state transition, and operator-facing message decision from `src/tui/App.tsx` callbacks while preserving the current product behavior and read-only/local-write safety boundary.

**Architecture:** Feature-owned pure transition functions accept current domain state and user input, then return next state, selected indices, notices, and I/O intents as data. `App.tsx` remains the React/Ink adapter that applies setters, invokes core/provider I/O, and enforces request-sequence or run-token publication checks. A TypeScript-AST audit inventories all 154 current `useCallback` declarations plus the single `useInput` dispatcher and prevents unclassified or newly introduced inline decision surfaces.

**Tech Stack:** Bun, TypeScript, React + Ink, TypeScript compiler API, Biome, Bun test.

## Global Constraints

- Keep the current keyboard bindings and current read-only/local-write product boundary unchanged.
- Do not test `src/tui/App.tsx` directly. Test every decision through its sibling `src/tui/*.ts` owner.
- Use `clampIndex()` from `src/tui/navigation.ts` for every domain-list selection repair. Empty lists resolve to index `0` and no selected item.
- Pure transitions may return effect intents, notices, and confirmation text, but may not perform filesystem, process, network, config, clipboard, or terminal I/O.
- Keep request-sequence checks around state published after `await`. Await a whole batch before publishing any of it, and do not let stale failures replace current state.
- Keep long-running action identity token-based and treat all non-terminal states, including `cancelling`, as busy.
- Preserve unrelated worktree changes. Do not commit `dist/`.
- For every task: write the focused failing test first, observe the expected failure, implement the smallest transition, run focused tests, run related regressions, run `bun run typecheck`, run `git diff --check`, review the diff, commit, and push after review.
- Update `docs/INCOMPLETE_FEATURES_CHECKLIST.md` in each implementation commit. Update `CHANGELOG.md` only when behavior or user-visible wording changes.

## Completion Contract

The final branch must satisfy all of these conditions:

- The callback audit reports 154 `useCallback` declarations and one `useInput`, with no duplicate, missing, stale, or unclassified manifest entries.
- The strict callback audit reports zero `inline-decision` entries.
- Every non-wiring entry names an existing tested `src/tui/*.ts` owner.
- Wiring entries state one permitted reason: React setter/event publication, direct I/O invocation, or stale request/run-token publication check.
- No inline `Math.min()`/`Math.max()` domain-selection clamp remains in `App.tsx`; layout sizing and clipping arithmetic is excluded.
- Focused transition tests, `bun run verify`, and `bun run release:check` pass from a clean pushed head.

---

### Task 1: Establish the executable callback inventory

**Files:**

- Create: `scripts/tuiCallbackAudit.ts`
- Create: `scripts/support/tuiCallbackManifest.ts`
- Create: `tests/tuiCallbackAudit.test.ts`
- Modify: `package.json`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Export `extractTuiCallbackInventory(sourceText)` using the TypeScript compiler API. It must find variable declarations initialized by `useCallback(...)`, including line-wrapped initializers, plus top-level `useInput(...)` calls.
- Inventory rows contain `{ name, startLine, endLine }`, using the stable synthetic name `useInput` for the dispatcher.
- Manifest rows contain `{ name, owner, classification, slice, reason }`, where classification is `inline-decision`, `delegated`, or `wiring`.
- `auditTuiCallbacks()` fails on duplicate inventory or manifest names, missing entries, stale entries, blank owner/slice, unsupported classification, or a wiring row without a permitted reason.
- `bun run audit:tui-callbacks` emits one JSON document with inventory and counts. `--strict` additionally fails while any row is `inline-decision`.
- Seed all 155 current rows. Assert the wrapped declarations at current source lines 3591, 3648, and 6281 are represented by name rather than hard-coding their line numbers.

**TDD sequence:**

- [ ] Add scanner tests with one-line and line-wrapped `useCallback` fixtures, `useInput`, duplicate/missing/stale manifest cases, and strict-mode rejection.
- [ ] Run `bun test tests/tuiCallbackAudit.test.ts` and observe the missing-module failure.
- [ ] Implement the AST scanner, manifest validator, JSON CLI, and complete current manifest.
- [ ] Run `bun test tests/tuiCallbackAudit.test.ts`.
- [ ] Run `bun run audit:tui-callbacks` and assert counts are `callbacks=154`, `useInput=1`, `total=155`.
- [ ] Run `bun run audit:tui-callbacks --strict` and record the expected non-zero result and current inline-decision count; strict mode is intentionally not yet part of `verify`.
- [ ] Update the checklist with the executable baseline and corrected 154 count.
- [ ] Run `bun run typecheck && git diff --check`.
- [ ] Commit as `test(tui): inventory App callback decisions` and push after review.

---

### Task 2: Extract tool prompt and target-preset transitions

**Files:**

- Modify: `src/tui/toolHistory.ts`
- Modify: `src/tui/commandLine.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/toolHistory.test.ts`
- Modify: `tests/commandLine.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`
- Modify: `CHANGELOG.md`

**Contract:**

- Add a single selected-preset resolver that clamps with `clampIndex()` and returns no item for an empty shelf.
- Add pure transitions for label, target value, action reassignment, promotion, removal, cleanup confirmation, save, and selected-target run intent.
- Transition results carry the updated shelf, repaired selection, command-line cleanup intent, and exact notice text. `App.tsx` must not reconstruct guard wording.
- Move tool prompt command-line application into a typed `commandLine.ts` transition.
- Cover the empty-list path that previously produced index `-1`, unchanged edits, missing selection, bounded-shelf eviction, and each keyboard path in Tools.

**TDD sequence:**

- [ ] Add failing tests for empty, below-zero, and beyond-end target selection plus every mutation/notice outcome.
- [ ] Run `bun test tests/toolHistory.test.ts tests/commandLine.test.ts` and observe the new API failures.
- [ ] Implement minimal pure transitions and wire the callbacks and Tools input branch to them.
- [ ] Mark the migrated tool callbacks as `delegated` in the manifest with `toolHistory.ts` or `commandLine.ts` owners.
- [ ] Run `bun test tests/toolHistory.test.ts tests/commandLine.test.ts tests/configPanel.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist and changelog for the empty-selection repair.
- [ ] Commit as `refactor(tui): extract tool target transitions` and push after review.

---

### Task 3: Extract editor mutation and cursor transitions

**Files:**

- Modify: `src/tui/editorBuffer.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/editorBuffer.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Add typed wrapper transitions for append, insert, replace, delete, cursor move, and undo.
- Each result includes the next buffer/history/cursor state, whether the operation applies, and the exact notice. Missing buffers and empty undo history are explicit no-op results.
- Repair cursors through tested editor helpers, not component arithmetic.
- Editor keyboard dispatch resolves the transition in `editorBuffer.ts`; `App.tsx` only applies setters.

**TDD sequence:**

- [ ] Add failing tests for missing buffer, empty text, before-start/after-end cursor, delete at bounds, and empty undo.
- [ ] Run `bun test tests/editorBuffer.test.ts` and observe the expected failures.
- [ ] Implement the transition wrappers and replace editor callback/input decisions.
- [ ] Reclassify editor callbacks in the manifest.
- [ ] Run `bun test tests/editorBuffer.test.ts tests/fileWritePreview.test.ts tests/editorSaveExecution.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract editor transitions`, and push after review.

---

### Task 4: Extract Files workspace loading, selection, and operation decisions

**Files:**

- Create: `src/tui/fileWorkspaceTransitions.ts`
- Create: `tests/fileWorkspaceTransitions.test.ts`
- Modify: `src/tui/fileSelection.ts`
- Modify: `src/tui/fileHistory.ts`
- Modify: `src/tui/fileOperationDialog.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/fileSelection.test.ts`
- Modify: `tests/fileHistory.test.ts`
- Modify: `tests/fileOperationDialog.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Own path/history movement, selected-entry resolution, preview/open eligibility, clipboard intent, editor-load outcome classification, and file-operation dialog launch in pure Files modules.
- `loadFiles` and `previewFile` keep provider I/O in `App.tsx`, but request sequencing must prevent stale success or failure from publishing current rows, preview, selection, or error state.
- Publish a listing batch only after all data needed for that batch is awaited.
- Files input handling delegates screen/focus guards, index movement, action eligibility, and notices to the owning transitions.

**TDD sequence:**

- [ ] Add failing pure-transition tests for empty listings, directory/file selection, history truncation, stale load result classification, and operation/open guards.
- [ ] Add request-sequence regression tests to the smallest pure sequence helpers needed by the load/preview writers.
- [ ] Run the four focused test files and observe the expected failures.
- [ ] Implement transitions, add separate load and preview sequences, and wire the Files callbacks/input branch.
- [ ] Reclassify Files callbacks and input ownership in the manifest.
- [ ] Run `bun test tests/fileWorkspaceTransitions.test.ts tests/fileSelection.test.ts tests/fileHistory.test.ts tests/fileOperationDialog.test.ts tests/requestSequence.test.ts tests/files.test.ts tests/fileOpen.test.ts tests/fileOperations.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract Files workspace transitions`, and push after review.

---

### Task 5: Extract Config shelf, settings, and palette decisions

**Files:**

- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/configPanel.test.ts`
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Move config-session synchronization, edit/reset confirmation, managed-shelf landing, focus/jump, cleanup-history reopen, palette result selection, and operator notices into the owning pure modules.
- Generic config I/O remains in `App.tsx`; transition output supplies the config intent and confirmation/notice text.
- Shared status work state uses the existing counted begin/end contract, paired in `finally`.
- Palette input returns a typed result for navigation, dismissal, command invocation, or no-op instead of branching on screen state in `useInput`.

**TDD sequence:**

- [ ] Add failing tests for no selection, empty managed shelves, reset confirmation mismatch, palette index bounds, and each landing/focus result.
- [ ] Run the three focused test files and observe the expected failures.
- [ ] Implement and wire pure Config/Status/Palette transitions.
- [ ] Reclassify the affected callbacks and dispatcher family.
- [ ] Run `bun test tests/configPanel.test.ts tests/config.test.ts tests/configCleanup.test.ts tests/statusActivityQueue.test.ts tests/palette.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract config and palette transitions`, and push after review.

---

### Task 6: Extract route, endpoint, Timeline, and Logs filter/input transitions

**Files:**

- Modify: `src/tui/routePanel.ts`
- Modify: `src/tui/endpointPanel.ts`
- Modify: `src/tui/timelinePanel.ts`
- Modify: `src/tui/logPanel.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/routePanel.test.ts`
- Modify: `tests/endpointPanel.test.ts`
- Modify: `tests/timelinePanel.test.ts`
- Modify: `tests/logPanel.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Each panel owns filter application/cleanup, selected-row resolution, section shortcuts, newest-result selection, preset transitions, and exact notices.
- Shared Connections/Ports bindings derive from the existing shared table and return screen-scoped intents without duplicating hint definitions.
- All index movement and refresh repair uses `clampIndex()` in the feature module.
- `useInput` branches become thin adapters over typed panel input decisions.

**TDD sequence:**

- [ ] Add failing tests for empty/filtered rows, invalid section shortcuts, last-row selection, cleanup no-op, and preset/filter notices.
- [ ] Run the four focused test files and observe the expected failures.
- [ ] Implement and wire the panel transitions.
- [ ] Reclassify affected callbacks and dispatcher ownership.
- [ ] Run `bun test tests/routePanel.test.ts tests/endpointPanel.test.ts tests/timelinePanel.test.ts tests/logPanel.test.ts tests/networkTimeline.test.ts tests/routes.test.ts tests/connections.test.ts tests/ports.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract network panel transitions`, and push after review.

---

### Task 7: Extract status evidence, export, archive, and recovery transitions

**Files:**

- Modify: `src/tui/cleanupIndex.ts`
- Modify: `src/tui/statusEvidence.ts`
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/toolHistory.ts`
- Modify: `src/tui/timelinePanel.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/cleanupIndex.test.ts`
- Modify: `tests/statusEvidence.test.ts`
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `tests/toolHistory.test.ts`
- Modify: `tests/timelinePanel.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Own refresh selection repair, selected export/archive/open eligibility, retention confirmation, recovered-index state, evidence search jump, handoff replay, and newest-result selection in the feature modules.
- Cover handoff, audit, cleanup, Tools, process, remote-known-hosts, interface-confirmation, Timeline, and status-activity evidence families.
- Async index refresh writers use separate request sequences for state groups that may update independently and check freshness before success and failure publication.
- Transition results include exact confirmation and status text; `App.tsx` only performs archive/open/export I/O and applies results.

**TDD sequence:**

- [ ] Add failing tests for empty indices, deleted selected rows, archive/retention mismatch, recovered export selection, stale refresh success, and stale refresh failure.
- [ ] Run the five focused suites and observe the expected failures.
- [ ] Implement transition helpers and sequence-safe callback adapters.
- [ ] Replace all evidence/newest-result inline selection arithmetic and reclassify manifest entries.
- [ ] Run `bun test tests/cleanupIndex.test.ts tests/statusEvidence.test.ts tests/statusActivityQueue.test.ts tests/toolHistory.test.ts tests/timelinePanel.test.ts tests/handoffIndex.test.ts tests/handoffsCommand.test.ts tests/externalOpen.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract evidence lifecycle transitions`, and push after review.

---

### Task 8: Extract interface and DNS target/proposal transitions

**Files:**

- Create: `src/tui/dnsPanel.ts`
- Create: `tests/dnsPanel.test.ts`
- Modify: `src/tui/interfacePanel.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/interfacePanel.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- `interfacePanel.ts` resolves selected interfaces, source handoffs, state proposal eligibility, confirmation drafts, and exact notices.
- `dnsPanel.ts` resolves DNS target/server proposals, locked preview intents, confirmation eligibility, and exact notices.
- Unsupported/empty target lists produce explicit no-op results and never expose an actionable key.
- These transitions create locked action intents only; they do not enable DNS or interface mutation.

**TDD sequence:**

- [ ] Add failing tests for empty lists, unsupported adapters, out-of-range selection, locked proposals, and exact confirmation mismatch.
- [ ] Run `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts` and observe the expected failures.
- [ ] Implement and wire the transitions and input branches.
- [ ] Reclassify affected callbacks and dispatcher ownership.
- [ ] Run `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts tests/interfaceControl.test.ts tests/dnsControl.test.ts tests/actions.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract interface and DNS transitions`, and push after review.

---

### Task 9: Extract remote profile, trust, known-hosts, and connection transitions

**Files:**

- Create: `src/tui/remotesPanel.ts`
- Create: `tests/remotesPanel.test.ts`
- Modify: `src/tui/App.tsx`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Own remote profile selection, host-key candidate selection, exact trust confirmation, paste-review state, retry eligibility, cancellation state, diagnostic notices, and evidence handoff intents in `remotesPanel.ts`.
- The transition must preserve exact confirmation bytes and treat matching `@revoked` fingerprints as global blockers.
- Retry after failure or cancellation returns to a state that requires exact confirmation again.
- SFTP/core transport calls, local `known_hosts` reads, audit writes, and guaranteed close remain I/O adapters in `App.tsx`/core.
- Connection async publication keeps one shared sequence for the diagnostic group and a token for the active long-running connection.

**TDD sequence:**

- [ ] Add failing tests for no profile, no selected host key, revoked candidate, confirmation mismatch, retry-after-cancel, non-terminal busy states, and stale failure publication.
- [ ] Run `bun test tests/remotesPanel.test.ts` and observe the expected failures.
- [ ] Implement and wire remote transitions and request/run identity guards.
- [ ] Reclassify remote callbacks and dispatcher ownership.
- [ ] Run `bun test tests/remotesPanel.test.ts tests/remotes.test.ts tests/connect.test.ts tests/sftp.test.ts tests/statusEvidence.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract remote lifecycle transitions`, and push after review.

---

### Task 10: Extract process inspection and operation-run transitions

**Files:**

- Modify: `src/tui/processPanel.ts`
- Modify: `src/tui/operationRunPanel.ts`
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/processPanel.test.ts`
- Modify: `tests/operationRunPanel.test.ts`
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Own selected-process inspection guards, inspector target state, operation-preset run eligibility, start/progress/cancel/completion/failure transitions, and exact audit/status messages.
- Every non-terminal operation status, including `cancelling`, is busy.
- Monitor runs use an identity token so a superseded run cannot clear cancellation or publish progress. Begin/end accounting remains paired exactly once in `finally`.
- Collector I/O and audit persistence remain in `App.tsx`/core.

**TDD sequence:**

- [ ] Add failing tests for missing process/preset, unsupported collector, double-start while cancelling, token supersession, partial cancellation, and stale failure.
- [ ] Run the three focused test files and observe the expected failures.
- [ ] Implement and wire the transitions and run-token checks.
- [ ] Reclassify process/operation callbacks and dispatcher ownership.
- [ ] Run `bun test tests/processPanel.test.ts tests/operationRunPanel.test.ts tests/statusActivityQueue.test.ts tests/processCommand.test.ts tests/operationsCommand.test.ts tests/monitorCommand.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract operation run transitions`, and push after review.

---

### Task 11: Extract action/control dispatch and outcome transitions

**Files:**

- Create: `src/tui/actionControlTransitions.ts`
- Create: `tests/actionControlTransitions.test.ts`
- Modify: `src/tui/endpointPanel.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/endpointPanel.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Move `runAction` guards, action lookup, risk/privilege/lock decisions, confirmation routing, control preview state, audit outcome classification, and operator messages into tested pure transitions.
- Transition outputs may request an existing core action execution, but must never construct or spawn OS commands.
- Locked/default behavior remains locked. Actions lacking risk, privilege, preview, adapter ownership, or required confirmation resolve to a blocked intent.
- Endpoint control rows advertise only actions available in their current state and provide named workspace/CLI handoffs where direct action is unavailable.

**TDD sequence:**

- [ ] Add failing tests for unknown/locked actions, missing metadata, read vs write confirmation, unsupported adapters, stale execution result, and control-row action availability.
- [ ] Run `bun test tests/actionControlTransitions.test.ts tests/endpointPanel.test.ts` and observe the expected failures.
- [ ] Implement and wire action/control transitions while preserving core execution boundaries.
- [ ] Reclassify `runAction`, control callbacks, and dispatcher ownership.
- [ ] Run `bun test tests/actionControlTransitions.test.ts tests/endpointPanel.test.ts tests/actions.test.ts tests/controlExecution.test.ts tests/interfaceControl.test.ts tests/dnsControl.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract action control transitions`, and push after review.

---

### Task 12: Extract command cancellation and complete per-screen input delegation

**Files:**

- Create: `src/tui/commandCancellation.ts`
- Create: `tests/commandCancellation.test.ts`
- Modify: `src/tui/commandLine.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/commandLine.test.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- Map every command prompt kind to a typed cancellation result containing dialog cleanup intents, command-line reset, focus restoration, and exact cancellation notice.
- Remove the Escape branch's prompt-specific chain and nested message ternary from `useInput`.
- Complete the dispatcher sweep so screen/focus guards, prompt-submit dispatch, palette special cases, selected-item resolution, index movement, and notices delegate to the feature owners created in Tasks 2–11.
- Keep `useInput` as Ink key normalization plus application of returned state/effect intents.

**TDD sequence:**

- [ ] Add table-driven failing tests covering every current prompt kind and no-prompt Escape behavior.
- [ ] Add command-line submit routing tests that prove all prompt kinds have an owner and effect intent.
- [ ] Run `bun test tests/commandCancellation.test.ts tests/commandLine.test.ts` and observe the expected failures.
- [ ] Implement cancellation transitions and replace remaining dispatcher decisions with owner calls.
- [ ] Reclassify `useInput` as `delegated` with a reason naming key normalization/effect application; reclassify all migrated prompt callbacks.
- [ ] Run `bun test tests/commandCancellation.test.ts tests/commandLine.test.ts tests/palette.test.ts tests/fileWorkspaceTransitions.test.ts tests/configPanel.test.ts tests/routePanel.test.ts tests/endpointPanel.test.ts tests/timelinePanel.test.ts tests/logPanel.test.ts tests/remotesPanel.test.ts`.
- [ ] Run `bun run audit:tui-callbacks && bun run typecheck && git diff --check`.
- [ ] Update checklist, commit as `refactor(tui): extract command input transitions`, and push after review.

---

### Task 13: Close the callback audit and selection-arithmetic gate

**Files:**

- Modify: `scripts/tuiCallbackAudit.ts`
- Modify: `scripts/support/tuiCallbackManifest.ts`
- Modify: `tests/tuiCallbackAudit.test.ts`
- Modify: `package.json`
- Modify: `src/tui/App.tsx`
- Modify: owning `src/tui/*.ts` modules and focused tests only where the audit finds residual decisions
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`

**Contract:**

- No manifest row remains `inline-decision`; each callback is `delegated` or `wiring`.
- Wiring classification is limited to `log`, `beginCommand`, `endCommand`, `refreshFiles`, `refresh`, and any newly proven equivalent that contains only an allowed reason. Any additional wiring row requires an explicit audit note and focused reviewer approval.
- Extend the audit with an AST check for inline `Math.min`/`Math.max` domain-selection clamps in callback/dispatcher bodies. Maintain a narrow allowlist only for layout sizing/clipping expressions outside domain selection.
- Add `bun run audit:tui-callbacks --strict` to `bun run verify` after the strict command passes.

**TDD sequence:**

- [ ] Add failing audit tests for an inline selection clamp, an unexplained wiring row, and a residual `inline-decision` row.
- [ ] Run `bun test tests/tuiCallbackAudit.test.ts` and observe the expected failures.
- [ ] Run strict audit, inspect every residual row, and move each actual decision into its named owner with a focused failing test before changing its classification.
- [ ] Run `bun run audit:tui-callbacks --strict` and require `callbacks=154`, `useInput=1`, `inlineDecision=0`.
- [ ] Add strict audit to the verify harness/package flow and run `bun test tests/tuiCallbackAudit.test.ts`.
- [ ] Run `bun run lint && bun run typecheck && git diff --check`.
- [ ] Update checklist with the zero-residual audit result, commit as `test(tui): enforce callback decision boundary`, and push after review.

---

### Task 14: Final completeness, release, and documentation verification

**Files:**

- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`
- Modify: `CHANGELOG.md` if Tasks 2–13 introduced user-visible fixes not already recorded
- Modify: `docs/superpowers/plans/2026-08-08-app-state-transition-extraction.md`

**Verification sequence:**

- [ ] Compare all Completion Contract bullets against the branch head and record the evidence in the checklist.
- [ ] Scan for placeholders and stale counts: `rg -n "T[O]DO|T[B]D|F[I]XME|15[1] useCallback|15[1] current" docs scripts src/tui tests package.json`.
- [ ] Run `bun run audit:tui-callbacks --strict`.
- [ ] Run `bun run verify`.
- [ ] Run `bun run release:check`.
- [ ] Run `git diff --check` and confirm `git status --short --branch` is clean except the final documentation update before commit.
- [ ] Perform a final specification review against `docs/superpowers/specs/2026-08-08-app-state-transition-extraction-design.md` and a separate code-quality review.
- [ ] Record actual test/file counts and verification results once, in `docs/INCOMPLETE_FEATURES_CHECKLIST.md`; other documents reference that source instead of copying counts.
- [ ] Commit as `docs: complete App transition extraction audit`, push, rerun the strict audit on the pushed head, and confirm the branch is clean and synchronized with origin.
