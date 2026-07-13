# v0.4.327 Interface Audit Handoff Plan

## Goal

Make blocked or rejected interface confirmation audit attempts reusable as Status Activity copy/export handoffs.

## Checklist

- [x] Show selected interface confirmation evidence rows in Status Activity copy intents.
- [x] Add a selected audit-export plan for interface confirmation results.
- [x] Wire Status `e` to export selected interface confirmation audits when no copy-intent row is selected.
- [x] Preserve action id, target, expected/received phrase, confirmed state, blockers, command preview, and Timeline query in exports.
- [x] Keep all interface execution, dry-run execution, privileged calls, and OS mutation disabled.
- [x] Cover copy preview, copy-intent rows, and selected export planning with tests.
- [x] Run focused tests, lint, typecheck, verify, and release checks.
- [ ] Publish a stacked draft PR on top of v0.4.326.

## Safety Boundary

This milestone records and exports audit evidence only. It does not add adapter execution, dry-run execution, privilege escalation, or interface mutation.

## Next

Add archived evidence indexing/open controls for interface confirmation audit exports or merge the interface evidence handoff into the Status Evidence family selector.
