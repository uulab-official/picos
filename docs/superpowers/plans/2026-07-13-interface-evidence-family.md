# v0.4.328 Interface Evidence Family Plan

## Goal

Make exported interface confirmation audit attempts manageable from Status Evidence like other OS-console evidence families.

## Checklist

- [x] Recover interface confirmation audit exports from the audit export index.
- [x] Add an `interface` Status Evidence family.
- [x] Support family focus, item movement, locked open, and Timeline search plans.
- [x] Wire Status `enter`, `I`, `G`, `Tab`, `1..9`, and `[`/`]` through the existing safe Evidence controls.
- [x] Keep adapter execution, dry-run execution, privileged calls, and OS mutation disabled.
- [x] Cover Status Evidence rows/plans and audit-index recovery with tests.
- [x] Run focused tests, lint, typecheck, verify, and release checks.
- [ ] Publish a stacked draft PR on top of v0.4.327.

## Safety Boundary

This milestone indexes and opens picos-owned audit evidence only. It does not add interface enable/disable execution, privileged commands, dry-run execution, or mutation controls.

## Next

Add command-palette `interface evidence` select/open/search actions, then archive/retention controls for interface audit evidence.
