# v0.4.330 Interface Evidence Targets Plan

## Goal

Make interface confirmation evidence easier to scan from the Status Activity copy-intent shelf by replacing long confirmation messages with compact target tokens.

## Checklist

- [x] Parse selected interface confirmation result rows into `interface.<action>:<status>` target tokens.
- [x] Preserve the selected interface label when the audit detail includes a target.
- [x] Keep Timeline audit recovery on the existing stable query.
- [x] Advertise the command-palette `interface evidence` recovery path in the copy-intent controls row.
- [x] Keep adapter execution, dry-run execution, privileged calls, and OS mutation disabled.
- [x] Cover the compact target row and controls hint with tests.
- [x] Run full verify and release checks.
- [x] Publish a stacked draft PR on top of v0.4.329.

## Safety Boundary

This milestone only changes Status Activity copy-intent text rendering for existing interface confirmation evidence. It does not add interface enable/disable execution, privileged commands, dry-run execution, or mutation controls.

## Next

Add archive/retention controls for recovered interface audit evidence.
