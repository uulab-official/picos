# v0.4.324 Interface Confirmation Draft Plan

## Goal

Show the exact confirmation phrase and blocked confirmation state inside locked interface enable/disable proposals before adding any prompt, adapter execution, or privileged OS call.

## Checklist

- [x] Add an `InterfaceConfirmationDraft` model to interface state proposals.
- [x] Render confirmation rows in core proposal formatting.
- [x] Surface confirmation rows in Interfaces workspace and command-palette previews.
- [x] Keep `confirmed=false`, `typed=""`, and `willExecute=false` explicit.
- [x] Add preflight confirmation requirement rows beside dry-run policy rows.
- [x] Cover proposal, workspace, and palette rendering with tests.
- [x] Run focused tests, lint, typecheck, verify, and release checks.
- [ ] Publish a stacked draft PR on top of v0.4.323.

## Safety Boundary

This milestone does not add a confirmation prompt, adapter mutation path, dry-run execution, privileged command execution, or interface state change.

## Next

Add a locked `:interface-confirm` prompt that records blocked or rejected confirmation attempts as audit evidence while still refusing to execute adapter commands.
