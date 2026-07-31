# Operations Workspace Design Options

> **Not a plan yet.** This records the four decisions a TUI Operations workspace needs before it can be written, each with the repo precedent that constrains it and a recommended default. It exists so the decisions can be agreed rather than invented mid-implementation.

**Status:** Blocked on agreement. The one prerequisite that could be settled without UX decisions is done and verified: `collectSystemMonitorSeries()` accepts an optional `shouldContinue` predicate and reports `cancelled`, published as `data.cancelled`. Nothing calls it yet.

**Why a workspace needs decisions at all:** `picos operations` is the only editor for operation presets, and the Config workspace deliberately reports them as coverage rather than as a managed shelf, because a managed shelf implies a workspace to jump to and an `enter` action. Adding that workspace means `enter` on a saved preset runs an inspector, and a maximal monitor preset occupies the full 300,000 ms interval span plus one process collector per sample under its own 5,000 ms timeout. Blocking the TUI for that long is only acceptable with a way out.

---

## What Already Exists

The cancellation primitive, in `src/core/systemMonitor.ts`:

- `shouldContinue` is consulted **after** each sample, never before, so a stopped run keeps every sample it already paid for and never sleeps through an interval for a sample it will not take.
- Stopping is not an error. There is no throw and no rejection; the caller receives a shorter series with `requestedCount` intact and can report two of ten.
- `cancelled` is explicit rather than derived from `samples.length < requestedCount`.

## The Precedent, And Where It Diverges

The read-only SFTP session in `src/core/sftp.ts` is the only other long operation the TUI is allowed to block on, and it establishes most of the shape:

- Cancellation is requested through a state transition, `requestReadOnlySftpConnectionCancellation(diagnostic)`, which returns a diagnostic with `status: "cancelling"` rather than mutating anything.
- `App.tsx` holds the diagnostic in `remoteConnectionDiagnosticRef` and mirrors it into state, so the row can re-render while the operation is still in flight.
- Progress is a single key-value row, for example `status=connecting attempt=1 duration=running network=opening`.
- The audit trail uses a regex-parseable prefix, `remote connect (confirmed-ready|confirmed-blocked|rejected|connected|failed|cancelled) <id>`, which `statusActivityQueue.ts` already parses to rebuild copy and jump intents.

One divergence is deliberate and should stay. SFTP cancellation is **error-based**: it checks `options.signal?.aborted` at several points and throws `ReadOnlySftpConnectionCancelledError`. Monitor sampling is **partial-result based**. That is not an inconsistency to fix: a half-open SFTP connection has no useful partial value, while collected monitor samples do. A reader comparing the two modules should find this note rather than conclude one is wrong.

## Decision 1: The Stop Key

**Options.** `X`, matching the SFTP session. `esc`, which is conventional but already means "close the prompt" and "clear the destination shelf landing banner" in Config, so it would be overloaded. `q`, which is unused in this context but has no precedent.

**Recommended:** `X`. It is the only existing binding for "abandon a long operation", and reusing it means the muscle memory transfers.

## Decision 2: Whether `enter` Confirms First

This is the decision with the most consequence, and it has no clean precedent: SFTP requires an exact-confirm phrase because connecting touches a remote host, while running a monitor preset is strictly local and read-only.

**Options.**

- **Always run immediately.** Simplest, and defensible because the action is read-only. Risks a keystroke starting a five-minute block.
- **Always exact-confirm.** Safest and matches SFTP, but makes the common case, `samples: 1`, needlessly heavy; that case returns one snapshot instantly.
- **Confirm only above a threshold.** Run immediately when the preset's interval span is small, confirm when it is large. Needs a number, and the number is arbitrary.

**Recommended:** run immediately, and rely on Decision 1 for the way out. The action is read-only, `samples: 1` is the common case, and a visible progress row plus a stop key is the same contract a file manager offers for a long directory read. If this turns out to feel wrong in use, the threshold variant is the fallback, not the always-confirm variant.

## Decision 3: The Progress Row

**Recommended shape,** mirroring the SFTP diagnostic row so both read the same way:

```text
status=sampling preset=pulse sample=3/10 interval=500 elapsed=running
```

`sample=3/10` comes directly from `samples.length` against `requestedCount`, which the primitive already reports, so no new state is needed beyond what a re-render needs. On completion the same row becomes `status=completed preset=pulse sample=10/10`, and on a stop it becomes `status=cancelled preset=pulse sample=3/10`, which is the honest reading of a partial series.

**Open sub-question:** whether the row lives in the workspace detail pane only, or also appears in the Status console. The SFTP diagnostic appears in both. Following that costs nothing here.

## Decision 4: Audit Rows

**Recommended shape,** parseable by the same style of pattern `statusActivityQueue.ts` already uses for remote connect:

```text
operations run (started|cancelled|completed|failed) <presetId> samples=<returned>/<requested>
```

Keeping the leading two words fixed and the status in a closed set is what lets the existing copy-intent and Timeline-search machinery pick these up without a second parser. Emitting `started` as its own row matters for the cancelled case: without it, a cancelled run that collected zero further samples would leave no trace that it ran at all.

## Out Of Scope For The First Slice

- Editing or removing a preset from the TUI. `picos operations` stays the only editor; the workspace is read and run only.
- Running logs or process presets concurrently with a monitor run. One run at a time keeps the progress row and the stop key unambiguous.
- Cancelling a logs or process preset run. Both are single collector calls bounded by their own `safeExec` timeout, so there is no long window to interrupt and no partial result to keep. Only monitor sampling needs the predicate.
