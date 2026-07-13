# v0.4.326 Interface Audit Recovery Plan

## Goal

Make blocked or rejected interface confirmation attempts recoverable after the operator leaves the Interfaces workspace.

## Checklist

- [x] Add a Status Activity result type for interface confirmation attempts.
- [x] Record interface confirmation results from the TUI submit path.
- [x] Preserve action id, target, expected/received phrase, confirmed state, blockers, and command preview in result detail.
- [x] Create reusable Timeline audit-search jumps from interface confirmation result-history rows.
- [x] Keep all interface execution, dry-run execution, privileged calls, and OS mutation disabled.
- [x] Cover result rows and Timeline search recovery with tests.
- [x] Run focused tests, lint, typecheck, verify, and release checks.
- [x] Publish a stacked draft PR on top of v0.4.325.

## Safety Boundary

This milestone records recovery metadata only. It does not add adapter execution, dry-run execution, privilege escalation, or interface mutation.

## Next

Add Status Evidence copy/export handoffs for interface confirmation audit attempts.
