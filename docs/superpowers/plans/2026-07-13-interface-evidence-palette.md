# v0.4.329 Interface Evidence Palette Plan

## Goal

Make recovered interface confirmation audit evidence discoverable from the command palette and reusable from Status Activity result history.

## Checklist

- [x] Add read-only Action Center entries for interface evidence select/open/search.
- [x] Add command palette discovery and selected-export previews for `interface evidence` queries.
- [x] Dispatch palette select/open/search into the existing Status Evidence interface evidence state.
- [x] Record palette-origin Status Activity result rows and searchable Timeline audit messages.
- [x] Record Status Evidence `G` searches with distinct `status evidence interface` result/audit origins.
- [x] Keep adapter execution, dry-run execution, privileged calls, and OS mutation disabled.
- [x] Cover action metadata, palette previews, Status Activity formatting, and Timeline recovery with tests.
- [x] Run full verify and release checks.
- [x] Publish a stacked draft PR on top of v0.4.328.

## Safety Boundary

This milestone only selects, opens, and searches picos-owned interface confirmation audit evidence. It does not add interface enable/disable execution, privileged commands, dry-run execution, or mutation controls.

## Next

Add archive/retention controls for interface audit evidence and make interface evidence targets visible in compact Status copy-intent shelf rows.
