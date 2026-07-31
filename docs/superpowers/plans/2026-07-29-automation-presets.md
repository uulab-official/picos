# Automation Presets Implementation Plan

**Goal:** Let scripts, CI, and coding agents replay the same bounded monitor, OS log, and process inspection without restating every option, and add bounded monitor sampling, without widening picos' read-only default posture.

**Architecture:** A pure core module owns operation preset parsing, bounds, storage order, and lookup, so both the CLI and the config store validate presets through the same helpers. Presets are declarative records of already-permitted inspector options, never command strings, and they are re-validated on load so a hand-edited config entry cannot smuggle an out-of-bounds request. `picos operations run` dispatches into the existing read-only monitor, OS log, and process collectors and returns each collector's own schema-versioned document with `request.presetId` added, which keeps one automation contract instead of a parallel preset envelope. Saving and removing a preset are the only config writes in the flow, so both sit behind an exact confirmation phrase. Monitor sampling reuses the existing snapshot collector behind an injectable clock/wait pair and stays inside a fixed total-duration bound. A real subprocess harness runs against an isolated temporary config directory so the gate never touches operator presets.

## Checklist

- [x] Add a pure operation preset core with bounded monitor, logs, and process preset kinds.
- [x] Bound preset ids, shelf size, log limits/filters/levels, process PIDs, and monitor sampling interval spans.
- [x] Re-validate presets when config loads and drop invalid hand-edited entries.
- [x] Add `operationPresets` to the config schema, defaults, merge path, and store writer.
- [x] Reject `operationPresets` from generic `picos config set`.
- [x] Add bounded monitor time-series collection with injectable snapshot reader, wait, and clock.
- [x] Add `picos monitor --samples <n> --interval <ms>` text and JSON output.
- [x] Add series JSON counts, duration, per-sample collector evidence, and min/max/average/last aggregates.
- [x] Add `picos operations list|show|save|run|remove` with `--json` on every action.
- [x] Require exact `save operation preset <id>` and `remove operation preset <id>` confirmations.
- [x] Return the underlying `monitor`, `logs`, or `process` document from `operations run` with `request.presetId`.
- [x] Keep the config path, raw collector output, and process command lines out of preset and run documents.
- [x] Emit one `PICOS_LOCAL_INSPECTOR_FAILED` document and a non-zero exit for bad confirmations, bad bounds, and missing presets.
- [x] Add unit, CLI-boundary, and config-store tests.
- [x] Add a real subprocess harness against an isolated temporary config directory.
- [x] Include the automation presets harness in `bun run verify` on macOS, Linux, and Windows.
- [x] Update public automation, harness, README, roadmap, changelog, Codex, Claude, and agent documentation.
- [ ] Run gstack review and full verification.
- [ ] Open the stacked draft PR on #414.
- [ ] Monitor CI and review.

## Next

Make saved presets first-class coding-agent workflows, then report them as Config shelf coverage in the TUI. Both follow-ons now have plans: [2026-07-29-operations-preset-contracts.md](2026-07-29-operations-preset-contracts.md) and [2026-07-29-operations-preset-visibility.md](2026-07-29-operations-preset-visibility.md).
