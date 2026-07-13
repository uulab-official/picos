# v0.4.325 Interface Confirmation Audit Plan

## Goal

Let operators type the exact interface enable/disable confirmation phrase from the Interfaces workspace while still refusing to execute adapter commands.

## Checklist

- [x] Add pure confirmation submission and audit-row modeling for interface proposals.
- [x] Render a locked `:interface-confirm` prompt from the Interfaces workspace.
- [x] Treat exact input as `confirmed-blocked` with `willExecute=false`.
- [x] Treat mismatched input as `rejected` with `willExecute=false`.
- [x] Show the latest confirmation audit rows beside the proposal.
- [x] Cover prompt rows, result rows, audit messages, and workspace rendering with tests.
- [x] Run focused tests, lint, typecheck, verify, and release checks.
- [ ] Publish a stacked draft PR on top of v0.4.324.

## Safety Boundary

This milestone does not add an interface adapter execution path, dry-run execution, privileged command execution, Status Activity persistence, or interface state mutation.

## Next

Persist interface confirmation audit attempts into Timeline/Status Activity as recoverable evidence without enabling execution.
