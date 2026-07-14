# Diagnostics JSON Implementation Plan

**Goal:** Expose doctor, DNS resolver state, and the complete lazyifconfig-style Tools Hub through one bounded, versioned automation contract without enabling OS mutation or serializing raw source output.

**Architecture:** Core doctor checks retain stable IDs and contain individual probe failures. Core tool results retain screen-oriented sections plus a separate normalized automation payload and source evidence. CLI handlers use the existing awaited stdout transport, shared 4 MiB limit, recursive redaction, and one-document failure reporting. A real cross-platform subprocess harness verifies live local diagnostics and deterministic guarded failures.

## Checklist

- [x] Add stable IDs to all eight doctor checks.
- [x] Contain gateway, DNS, internet, ping, and public-IP probe errors per check.
- [x] Add normalized data and source evidence to all eight Tools Hub runners.
- [x] Add `doctor --json`, `dns --json`, and `tools ... --json`.
- [x] Keep raw tool/OS output outside JSON and reject `--raw --json` before execution.
- [x] Emit `status=blocked` and `PICOS_ACTION_LOCKED` for `dns flush --json`.
- [x] Bound tool timeout input to 100-60,000 ms.
- [x] Recursively redact credential-like object fields, URL credentials, home paths, and private-key paths.
- [x] Add unit and CLI-boundary contract tests.
- [x] Add a real subprocess harness with a disposable localhost TCP peer.
- [x] Include the diagnostics harness in `bun run verify` on macOS, Linux, and Windows.
- [x] Update public automation, harness, roadmap, changelog, Codex, Claude, and agent documentation.
- [x] Run gstack review and full verification.
- [x] Open stacked draft PR [#413](https://github.com/uulab-official/picos/pull/413) on #412.
- [ ] Monitor CI and automated review on #413.

## Next

Extend the same normalized automation contract to monitor, logs, and individual process inspection. Keep process arguments, raw OS logs, and unbounded source text excluded.
