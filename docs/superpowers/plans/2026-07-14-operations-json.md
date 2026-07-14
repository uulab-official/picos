# Operations JSON Implementation Plan

**Goal:** Expose system monitor, OS log triage, and single-process inspection as bounded automation contracts while keeping process arguments, unbounded command output, and unredacted log secrets outside JSON.

**Architecture:** Core collectors retain explicit source evidence for process lists, process detail, process files, and OS logs. A dedicated CLI formatter maps those results onto the existing schema-versioned 4 MiB local-inspector envelope. CLI handlers validate options before collection, use awaited stdout delivery, and emit exactly one structured failure on parser, collector, or serialization errors. A real subprocess harness proves live and deterministic failure behavior on every supported CI OS.

## Checklist

- [x] Preserve process-list source evidence in monitor snapshots.
- [x] Add source-aware process detail and optional file-snapshot collectors.
- [x] Preserve OS-log exit, capture-truncation, and requested-limit evidence.
- [x] Add `monitor --json`, `logs ... --json`, and `process <pid> [--files] --json`.
- [x] Omit process command arguments and raw process/log command output.
- [x] Redact credential assignments, authorization headers, bearer tokens, URL credentials, home paths, and SSH private-key paths.
- [x] Bound log limits, filters, messages, process resources, and final documents.
- [x] Keep unsupported process-file inspection distinct from collector failure.
- [x] Emit one JSON failure and a non-zero exit for invalid options, missing PIDs, or failed primary sources.
- [x] Add unit, CLI-boundary, and real subprocess contract tests.
- [x] Include the operations harness in `bun run verify` on macOS, Linux, and Windows.
- [x] Update public automation, harness, roadmap, changelog, Codex, Claude, and agent documentation.
- [x] Run gstack review and full verification.
- [x] Open stacked draft PR #414 on #413.
- [x] Monitor #414 CI and review.

## Next

Expose saved monitor/log/process presets and bounded time-series sampling, then connect the same contracts to coding-agent workflows without widening mutation permissions.
